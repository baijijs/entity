const util = require('util');
const chai = require('chai');
const assert = require('assert');
const expect = chai.expect;

const Entity = require('../');


describe('Entity', function() {
  let SomeEntity, SomeOtherEntity;

  beforeEach(function() {
    SomeEntity = new Entity();
    SomeOtherEntity = new Entity();
  });

  describe('#constructor', function() {
    it('should be able to add fields via initialization', function() {
      let profileEntity = new Entity({
        hobbies: { type: 'string' },
        location: { type: 'string' }
      });

      let entity = new Entity({
        name: { type: 'string' },
        sex: { type: 'string', as: 'gender' },
        age: { type: 'number', default: 16 },
        isAdult: [{ type: 'boolean' }, function(obj) { return obj.age >= 18 ? true : false; }],
        girlfriend: { type: 'boolean', default: true, if: function(obj) { return obj.age >= 16 ? true : false; } },
        social: [{ using: SomeEntity }, function() { return {}; }],
        profile: { type: 'object', using: profileEntity, default: {} }
      });

      let obj1 = entity.parse({ name: 'felix', sex: 'male', age: 20, skype: 'mySkype' });
      let obj2 = entity.parse({ name: 'felix', sex: 'male' });
      let obj3 = entity.parse({ name: 'felix', sex: 'male' }, { overwrite: true });
      let obj4 = entity.parse(
        { name: 'felix', sex: 'male', profile: { location: 'nowhere' } },
        { fields: 'name profile{location}' }
      );

      expect(obj1).to.have.property('name', 'felix');
      expect(obj1).to.have.property('gender', 'male');
      expect(obj1).to.have.property('age', 20);
      expect(obj1).to.have.property('isAdult', true);
      expect(obj1).to.have.property('girlfriend', true);
      expect(obj1).to.not.have.property('mySkype');

      expect(obj2).to.have.property('name', 'felix');
      expect(obj2).to.have.property('gender', 'male');
      expect(obj2).to.have.property('age', 16);
      expect(obj2).to.have.property('isAdult', false);
      expect(obj2).to.not.have.property('girlfriend');

      expect(obj3).to.have.property('girlfriend');

      expect(obj4).to.have.property('name', 'felix');
      expect(obj4).to.not.have.property('sex');
      expect(obj4).to.have.nested.property('profile.location', 'nowhere');
      expect(obj4).to.not.have.nested.property('profile.hobbies');
    });

    it('should be able to chain initialization with add method', function() {
      let entity = new Entity({
        name: { type: 'string' }
      })
        .add('sex', { type: 'string', as: 'gender' })
        .add('age', { type: 'number', default: 16 });

      let obj = entity.parse({ name: 'felix', sex: 'male' });

      expect(obj).to.have.property('name', 'felix');
      expect(obj).to.have.property('gender', 'male');
      expect(obj).to.have.property('age', 16);
    });

    it('should support options.get param', function() {
      let entity = new Entity({
        name: { type: 'string' },
        age: { type: 'number' },
        isAdult: { type: 'boolean', get(obj) {
          return obj.age >= 18 ? true : false;
        } }
      });
      let obj1 = entity.parse({
        name: 'felix',
        age: 24,
      });
      assert.deepEqual(obj1, {
        name: 'felix',
        age: 24,
        isAdult: true
      });

      let obj2 = entity.parse({
        name: 'felix',
        age: 17,
      });
      assert.deepEqual(obj2, {
        name: 'felix',
        age: 17,
        isAdult: false
      });
    });

    it('should support difference array config', function() {
      let entity1 = new Entity({
        name: { type: 'string' },
        friends: { type: ['string'] }
      });
      let obj = { name: 'felix', friends: ['liqiang', 'wangtao'] };
      let obj1 = entity1.parse(obj);
      assert.deepEqual(obj1, obj);

      let entity2 = new Entity({
        name: { type: 'string' },
        friends: [{ type: 'string' }]
      });
      let obj2 = entity2.parse(obj);
      assert.deepEqual(obj2, obj);
    });

    it('should support difference array object config', function() {
      let childEntity = new Entity({
        id: { type: 'string' },
        name: { type: 'string' }
      });
      let entity1 = new Entity({
        name: { type: 'string' },
        children: { type: ['object'], default: [], using: childEntity }
      });
      let rawObj = { name: 'liqiang', children: [{ id: 1, name: 'first' }, { id: 2, name: 'second' }] };
      let obj1 = entity1.parse(rawObj);
      assert.deepEqual(rawObj, obj1);

      let entity2 = new Entity({
        name: { type: 'string' },
        children: [{ type: 'object', using: childEntity }]
      });
      let obj2 = entity2.parse(rawObj);
      assert.deepEqual(rawObj, obj2);
    });

    it('simplify sub-entity', function() {
      let entity1 = new Entity({
        name: { type: 'string' },
        info: {
          age: { type: 'number' },
          gender: { type: 'string' },
          type: { type: 'string' }
        }
      });
      let obj1 = { name: 'felix', info: { age: 18, gender: 'male', type: 'a' } };
      let obj2 = entity1.parse(obj1);
      assert.deepEqual(obj1, obj2);

      let obj3 = entity1.parse({ name: 'felix', info: { age: 18, gender: 'male', type: 'a', sex: 1 }, nickname: 'whatever' });
      assert.deepEqual(obj1, obj3);

      let entity2 = new Entity({
        name: { type: 'string' },
        friends: [{
          name: { type: 'string' },
          age: { type: 'number' }
        }]
      });
      let obj4 = { name: 'felix', friends: [{ name: 'liqiang', age: 18 }, { name: 'wangtao', age: 18 }] };
      let obj5 = entity2.parse(obj4);
      assert.deepEqual(obj4, obj5);

      let obj6 = entity2.parse({ name: 'felix', friends: [{ name: 'liqiang', age: 18, nickname: 'a' }, { name: 'wangtao', age: 18, nickname: 'a' }], nickname: 'a' });
      assert.deepEqual(obj4, obj6);
    });

    it('using sub-entity directly', function() {
      let childEntity = new Entity({ id: { type: 'number' }, name: { type: 'string' } });
      let entity = new Entity({
        nickname: { type: 'string' },
        child: childEntity
      });
      let obj = { nickname: 'felix', child: { id: 1, name: 'a' } };
      let obj1 = entity.parse(obj);
      assert.deepEqual(obj, obj1);

      let entity2 = new Entity({
        nickname: { type: 'string' },
        child: [childEntity]
      });
      let obj2 = { nickname: 'felix', child: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] };
      let obj3 = entity2.parse(obj2);
      assert.deepEqual(obj2, obj3);
    });

    it('sub-entity default value should be undefined', function() {
      let childEntity = new Entity({
        id: { type: 'string' },
        name: { type: 'string' }
      });
      let entity = new Entity({
        name: { type: 'string' },
        child: childEntity
      });

      let obj = { name: 'liqiang' };
      assert(entity.parse(obj).child === undefined);
    });

    it('array sub-entity default value should be []', function() {
      let childEntity = new Entity({
        id: { type: 'string' },
        name: { type: 'string' }
      });
      let entity = new Entity({
        name: { type: 'string' },
        children: [childEntity]
      });

      let obj = { name: 'liqiang' };
      assert.deepEqual(entity.parse(obj), { name: 'liqiang', children: [] });
    });

    it('should support complex situation', function() {
      let entity1 = new Entity({
        name: { type: 'string' },
        friends: [{ type: ['object'] }, function(obj) {
          return (obj.friends || []).map(o => ({
            name: o.name || '',
            age: (o.age || 0) + 1
          }));
        }]
      });
      let entity2 = new Entity({
        name: { type: 'string' },
        friends: {
          type: ['object'],
          get(obj) {
            return (obj.friends || []).map(o => ({
              name: o.name || '',
              age: (o.age || 0) + 1
            }));
          }
        }
      });
      let entity3 = new Entity({
        name: { type: 'string' },
        friends: [{
          type: 'object',
          get(obj) {
            return (obj.friends || []).map(o => ({
              name: o.name || '',
              age: (o.age || 0) + 1
            }));
          }
        }]
      });
      let rawObj = { name: 'liqiang', friends: [{ name: 'first', age: 1 }, { name: 'second', age: 2 }] };
      assert.deepEqual(entity1.parse(rawObj), entity2.parse(rawObj));
      assert.deepEqual(entity1.parse(rawObj), entity3.parse(rawObj));
    });

    it('should correctly parse if change fields\' name', function() {
      let entity = new Entity({
        name: { type: 'string' },
        age: { type: 'number' },
        children: [{
          id: { type: 'number' },
          name: { type: 'string' }
        }]
      });
      let rawObj = { name: 'lq', age: 25, children: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] };
      let obj1 = entity.parse(rawObj, { fields: 'name children' });
      assert.deepEqual(obj1, { name: 'lq', children: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] });

      let obj2 = entity.parse(rawObj, { fields: 'name: nickname age' });
      assert.deepEqual(obj2, { nickname: 'lq', age: 25 });

      let obj3 = entity.parse(rawObj, { fields: 'name children: babies { name }' });
      assert.deepEqual(obj3, { name: 'lq', babies: [{ name: 'a' }, { name: 'b' }] });
    });
  });

  describe('#isEntity(obj)', function() {
    it('should be true if obj is an Entity', function() {
      expect(Entity.isEntity(SomeEntity)).to.equal(true);
      expect(Entity.isEntity('whatever')).to.equal(false);
    });

    it('should be false if obj is not an Entity', function() {
      expect(Entity.isEntity('string')).to.equal(false);
      expect(Entity.isEntity('')).to.equal(false);
      expect(Entity.isEntity(1)).to.equal(false);
      expect(Entity.isEntity(false)).to.equal(false);
      expect(Entity.isEntity(true)).to.equal(false);
      expect(Entity.isEntity({})).to.equal(false);
    });

    it('should always return true for Entity object', function() {
      expect(SomeEntity.isEntity()).to.equal(true);
      expect(SomeEntity.isEntity('whatever')).to.equal(true);
    });
  });

  describe('#add()', function() {
    it('should add multi-fields', function() {
      let entity;
      let fn = function(){ entity = SomeEntity.add('name', 'gender', { type: 'string' }); };

      expect(fn).to.not.throw(Error);

      let obj = entity.parse({ name: 'felix', gender: 'male', age: 20 });

      expect(obj).to.have.property('name', 'felix');
      expect(obj).to.have.property('gender', 'male');
    });

    it('should add multi-fields with :default option', function() {
      let entity;
      let fn = function(){ entity = SomeEntity.add('name', 'age', 'gender', { type: 'string', default: 'default' }); };

      expect(fn).to.not.throw(Error);

      let obj = entity.parse({});

      expect(obj).to.have.property('name', 'default');
      expect(obj).to.have.property('age', 'default');
      expect(obj).to.have.property('gender', 'default');
    });

    it('should add multi-fields with :if option', function() {
      let entity;
      let fn = function(){ entity = SomeEntity.add('name', 'age', 'gender', { if: function(obj){ return obj.age > 15; } }); };

      expect(fn).to.not.throw(Error);

      let obj = entity.parse({ name: 'felix', gender: 'male', age: 20 });

      expect(obj).to.have.property('name');
      expect(obj).to.have.property('age', 20);
      expect(obj).to.have.property('gender');
    });

    it('should add one field with :using option', function() {
      let infoEntity = new Entity({
        age: { type: 'number' },
        sex: { type: 'string', default: 'male' }
      });

      let entity = new Entity({
        name: { type: 'string' }
      })
        .add('info', { using: infoEntity });

      let obj = entity.parse({ name: 'felix', info: { age: 20 } });

      expect(obj).to.have.property('name');
      expect(obj).to.have.nested.property('info.age', 20);
      expect(obj).to.have.nested.property('info.sex', 'male');
    });

    it('should add one field with options or function', function() {
      SomeEntity.add('name', { using: SomeOtherEntity, as: 'fullName' });
      SomeEntity.add('age', { type: 'number', default: 20 }, function(obj) {
        return obj.age && obj.age * 2;
      });
      SomeEntity.add('gender', { default: 20, using: SomeOtherEntity }, function(obj) {
        return obj.gender && obj.gender === 1 ? 'male' : 'female';
      });

      let obj = SomeEntity.parse({ name: 'felix', age: 15, gender: 1 });

      expect(obj).to.not.have.property('name');
      expect(obj).to.have.property('fullName').to.be.empty;
      expect(obj).to.have.property('age', 30);
      expect(obj).to.have.property('gender').to.be.empty;
    });

    it('should format date according to format option', function() {
      SomeEntity
        .add('name', { type: 'string' })
        .add('borned', { format: 'iso' });

      let obj = SomeEntity.parse({ name: 'felix', borned: new Date(1990, 0, 1) });
      expect(obj).to.have.property('name', 'felix');
      expect(obj).to.have.property('borned', new Date(1990, 0, 1).toISOString());

      SomeOtherEntity
        .add('name', { type: 'string' })
        .add('borned', { format: 'timestamp' });

      let obj1 = SomeOtherEntity.parse({ name: 'felix', borned: new Date(1990, 0, 1) });
      expect(obj1).to.have.property('name', 'felix');
      expect(obj1).to.have.property('borned', String(new Date(1990, 0, 1).getTime()));
    });

    it('should throw an error when use :value option with function', function() {
      let fn = function() {
        SomeEntity.add('name', { value: 'myName' }, function(obj) { return obj; });
      };

      expect(fn).to.throw(Error);
    });

    it('should throw an error when use :value option with :as option', function() {
      let fn = function() {
        SomeEntity.add('name', { value: 'myName', as: 'myName' });
      };

      expect(fn).to.throw(Error);
    });

    it('should throw an error if fields name is not valid', function() {
      let fn = function() {
        let args = arguments;
        return function() {
          SomeEntity.add.call(SomeEntity, args);
        };
      };
      expect(fn('')).to.throw(Error);
      expect(fn({})).to.throw(Error);
      expect(fn(function(){})).to.throw(Error);
      expect(fn(false)).to.throw(Error);
      expect(fn([])).to.throw(Error);
      expect(fn('-')).to.throw(Error);
      expect(fn('&')).to.throw(Error);
      expect(fn('!fdsf)')).to.throw(Error);
      expect(fn('name', 'value', '!fdsf)')).to.throw(Error);
    });

    it('should throw an error when use function for multi-fields', function() {
      let fn = function() {
        SomeEntity.add('name', 'age', 'gender', function(obj){ return obj; });
      };

      expect(fn).to.throw(Error);
    });

    it('should throw an error when use :as option for multi-fields', function() {
      let fn = function() {
        SomeEntity.add('name', 'age', 'gender', { as: 'myName' });
      };

      expect(fn).to.throw(Error);
    });

    it('should throw an error when use :as option with function', function() {
      let fn = function() {
        SomeEntity.add('name', { as: 'myName' }, function(obj) { return obj; });
      };

      expect(fn).to.throw(Error);
    });

    it('should throw an error when ignore type field', function() {
      let fn = function() {
        SomeEntity.add('name', {});
      };
      expect(fn).to.throw(Error);

      SomeOtherEntity.add('name', { type: 'string' });
      let obj = SomeOtherEntity.parse({ name: 'felix', age: 18 });
      assert.deepEqual(obj, { name: 'felix' });
    });
  });

  describe('#expose()', function() {
    it('should be aliased', function() {
      expect(Entity.prototype.expose).to.equal(Entity.prototype.add);
    });
  });

  describe('#unexpose()', function() {
    it('should hide fields from exposure', function() {
      let entity = new Entity({
        name: { type: 'string' },
        age: { type: 'number', default: 18 },
        gender: { type: 'string', default: 'male' }
      });

      let obj1 = entity.parse({ name: 'felix' });
      expect(obj1).to.have.property('name', 'felix');
      expect(obj1).to.have.property('age', 18);
      expect(obj1).to.have.property('gender', 'male');

      entity.unexpose('age');
      let obj2 = entity.parse({ name: 'felix' });
      expect(obj2).to.have.property('name', 'felix');
      expect(obj2).to.not.have.property('age');
      expect(obj2).to.have.property('gender', 'male');
    });
  });

  describe('#parse(input, options, converter)', function() {
    let UserEntity, SocialEntity;

    beforeEach(function() {
      UserEntity = new Entity();
      UserEntity.add('name', 'city', { type: 'string' });
      UserEntity.add('age', { type: 'number', default: 0 });
      UserEntity.add('gender', { type: 'string', default: 'unknown' });
      UserEntity.add('isAdult', { type: 'boolean' }, function(obj) {
        return (obj && obj.age >= 18 ? true : false);
      });
      UserEntity.add('points', { value: 100, if: function(obj) {
        return obj && obj.age >= 18;
      } });
      UserEntity.add('description', { type: 'string', as: 'introduction' });
      UserEntity.add('isSignedIn', { type: 'boolean' }, function(obj, options) {
        return (options && options.isSignedIn ? true : false);
      });
      UserEntity.add('birthday', { type: 'string', default: new Date('2015-10-10 10:00:00') });

      UserEntity.add('hasGirlfriend', { type: 'boolean' });

      SocialEntity = new Entity();
      SocialEntity.add('qq', 'skype', 'facebook', 'twitter', { type: 'string' });

      UserEntity.add('social', { using: SocialEntity });
      UserEntity.add('habits', { type: ['string'] });
    });

    it('should only return exposed fields', function() {
      let user = {
        name: 'felix',
        age: 18,
        city: 'Shanghai',
        state: 'Shanghai'
      };

      let result = UserEntity.parse(user);
      expect(result).to.have.property('name', 'felix');
      expect(result).to.have.property('city', 'Shanghai');
      expect(result).to.have.property('age', 18);
      expect(result).to.not.have.property('state');
    });

    it('should return default value', function() {
      expect(UserEntity.parse({})).to.have.property('gender', 'unknown');
    });

    it('should return exposed fields by if confition and :value option', function() {
      let user = { age: 18 };
      let user1 = { age: 16 };

      expect(UserEntity.parse(user)).to.have.property('points', 100);
      expect(UserEntity.parse(user1)).to.not.have.property('points');
    });

    it('should return exposed fields value by function', function() {
      let user = { age: 18 };
      let user1 = { age: 16 };

      expect(UserEntity.parse(user)).to.have.property('isAdult', true);
      expect(UserEntity.parse(user1)).to.have.property('isAdult', false);
    });

    it('should return aliased fields', function() {
      let user = { description: 'A programmer who lives in Shanghai' };

      let result = UserEntity.parse(user);
      expect(result).to.have.property('introduction', user.description);
      expect(result).to.not.have.property('description');
    });

    it('should return fields based on options', function() {
      expect(UserEntity.parse({}, { isSignedIn: true })).to.have.property('isSignedIn', true);
      expect(UserEntity.parse({}, { isSignedIn: false })).to.have.property('isSignedIn', false);
    });

    it('should return sub-fields specified by using Entity', function() {
      let user = { social: { qq: '66666666', skype: 'mySkype', facebook: 'myFacebook', twitter: 'myTwitter', tumblr: 'myTumblr' } };
      let user1 = { social: [{ qq: '66666666', skype: 'mySkype', facebook: 'myFacebook', twitter: 'myTwitter', tumblr: 'myTumblr' }] };

      let result = UserEntity.parse(user);
      let result1 = UserEntity.parse(user1);

      expect(result).to.have.nested.property('social.qq', user.social.qq);
      expect(result).to.have.nested.property('social.skype', user.social.skype);
      expect(result).to.have.nested.property('social.facebook', user.social.facebook);
      expect(result).to.have.nested.property('social.twitter', user.social.twitter);
      expect(result).to.not.have.nested.property('social.tumblr');

      expect(result1).to.have.nested.property('social[0].qq', user1.social[0].qq);
      expect(result1).to.have.nested.property('social[0].skype', user1.social[0].skype);
      expect(result1).to.have.nested.property('social[0].facebook', user1.social[0].facebook);
      expect(result1).to.have.nested.property('social[0].twitter', user1.social[0].twitter);
      expect(result1).to.not.have.nested.property('social[0].tumblr');
    });

    it('should convert fields value based on converter', function() {
      let converter = function(val) {
        if (val instanceof Date) {
          return util.format('%s-%s-%s', val.getUTCFullYear(), val.getUTCMonth() + 1, val.getUTCDate());
        }
        return val;
      };

      expect(UserEntity.parse({}, converter)).to.have.property('birthday', '2015-10-10');
      expect(UserEntity.parse({}, {}, converter)).to.have.property('birthday', '2015-10-10');
    });

    it('should normalize fields value according to fields type', function() {
      let user = {
        name: 123,
        habits: [123, true, 'pingpong'],
        hasGirlfriend: 'true'
      };

      let result = UserEntity.parse(user);
      expect(result).to.have.property('name', '123');
      expect(result).to.have.property('habits').eql(['123', 'true', 'pingpong']);
      expect(result).to.have.property('hasGirlfriend', true);
    });
  });

  describe('#clone()', function() {
    it('should clone provided Entity object', function() {
      let entity = new Entity({
        name: { type: 'string' }
      });
      let obj1 = entity.parse({ name: 'felix' });
      expect(obj1).to.have.property('name', 'felix');

      let inheritedEntity = Entity.clone(entity)
        .add('age', { type: 'number', default: 18 });

      let obj2 = inheritedEntity.parse({ name: 'felix' });
      expect(obj2).to.have.property('name', 'felix');
      expect(obj2).to.have.property('age', 18);
      expect(obj1).to.not.have.property('age');
    });
  });

  describe('#safeAdd()', function() {
    it('should create a new entity by calling safeAdd', function() {
      let entity = new Entity({
        name: { type: 'string' }
      });
      let obj1 = entity.parse({ name: 'felix' });
      expect(obj1).to.have.property('name', 'felix');

      let newEntity = entity.safeAdd('age', { type: 'number', default: 18 });

      let obj2 = newEntity.parse({ name: 'felix' });
      expect(obj2).to.have.property('name', 'felix');
      expect(obj2).to.have.property('age', 18);
      expect(obj1).to.not.have.property('age');
    });
  });

  describe('#copy()', function() {
    it('should be aliased', function() {
      expect(Entity.copy).to.equal(Entity.clone);
    });
  });

  describe('#extend()', function() {
    it('should create a new Entity object based on provided one and object', function() {
      let entity = new Entity({
        name: { type: 'string' }
      });
      let obj1 = entity.parse({ name: 'felix' });
      expect(obj1).to.have.property('name', 'felix');

      let inheritedEntity = Entity.extend(entity, { age: { type: 'number', default: 18 } })
        .add('gender', { type: 'string', default: 'male' });

      let obj2 = inheritedEntity.parse({ name: 'felix' });
      expect(obj2).to.have.property('name', 'felix');
      expect(obj2).to.have.property('age', 18);
      expect(obj2).to.have.property('gender', 'male');
      expect(obj1).to.not.have.property('age');
      expect(obj1).to.not.have.property('male');
    });
  });

  describe('#pick()', function() {
    it('should create a new Entity only contain specified fields', function() {
      let entity = new Entity({
        name: { type: 'string' },
        age: { type: 'number' }
      });
      let pickedEntity1 = entity.pick('name');
      let pickedEntity2 = entity.pick({ name: 1 });

      let rawObj = { name: 'liqiang', age: 25 };
      let obj = entity.parse(rawObj);
      let obj1 = pickedEntity1.parse(rawObj);
      let obj2 = pickedEntity2.parse(rawObj);

      assert.deepEqual(obj, { name: 'liqiang', age: 25 });
      assert.deepEqual(obj1, { name: 'liqiang' });
      assert.deepEqual(obj2, { name: 'liqiang' });

      let pickedEntity3 = entity.pick();
      let obj3 = pickedEntity3.parse(rawObj);
      assert.deepEqual(obj3, rawObj);

      let pickedEntity4 = entity.pick('name age');
      let obj4 = pickedEntity4.parse(rawObj);
      assert.deepEqual(obj4, rawObj);
    });

    it('should throw an error if pick fields not exist', function () {
      function pick() {
        let entity = new Entity({
          name: { type: 'string' },
          age: { type: 'number' }
        });
        entity.pick('name sex');
      }

      expect(pick).to.throw(Error);
    });

    it('could change key\'s name', function() {
      let entity = new Entity({
        name: { type: 'string' },
        age: { type: 'number' }
      });
      let pickedEntity1 = entity.pick('name: nickname');
      let pickedEntity2 = entity.pick({ name: 'nickname' });

      let rawObj = { name: 'liqiang', age: 25 };
      let obj = entity.parse(rawObj);
      let obj1 = pickedEntity1.parse(rawObj);
      let obj2 = pickedEntity2.parse(rawObj);

      assert.deepEqual(obj, { name: 'liqiang', age: 25 });
      assert.deepEqual(obj1, { nickname: 'liqiang' });
      assert.deepEqual(obj2, { nickname: 'liqiang' });
    });

    it('should support sub-entity', function() {
      let entity = new Entity({
        name: { type: 'string' },
        children: [{
          id: { type: 'number' },
          name: { type: 'string' }
        }]
      });
      let pickedEntity1 = entity.pick('children');
      let pickedEntity2 = entity.pick({ children: 1 });

      let rawObj = { name: 'liqiang', children: [{ id: 1, name: 'first' }, {id: 2, name: 'second' }] };
      let obj1 = pickedEntity1.parse(rawObj);
      let obj2 = pickedEntity2.parse(rawObj);

      assert.deepEqual(obj1, obj2);
      assert.deepEqual(obj1, { children: [{ id: 1, name: 'first' }, { id: 2, name: 'second' }] });


      let pickedEntity3 = entity.pick('children{id}');
      let pickedEntity4 = entity.pick({ children: { id: 1 } });

      let obj3 = pickedEntity3.parse(rawObj);
      let obj4 = pickedEntity4.parse(rawObj);

      assert.deepEqual(obj3, obj4);
      assert.deepEqual(obj3, { children: [{ id: 1 }, { id: 2 }] });

      let pickedEntity5 = entity.pick('children: child');
      let obj5 = pickedEntity5.parse(rawObj);
      assert.deepEqual(obj5, { child: [{ id: 1, name: 'first' }, { id: 2, name: 'second' }] });

      let pickedEntity6 = entity.pick('children{id: uid name}');
      let obj6 = pickedEntity6.parse(rawObj);
      assert.deepEqual(obj6, { children: [{ uid: 1, name: 'first' }, { uid: 2, name: 'second' }] });
    });

    it('should support pick sub entity and rename', function() {
      let entity = new Entity({
        name: { type: 'string' },
        age: { type: 'number' },
        children: [{
          id: { type: 'number' },
          name: { type: 'string' }
        }]
      });
      let pickedEntity = entity.pick('name children: babies { name }');
      let rawObj = { name: 'lq', age: 25, children: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] };

      let obj = pickedEntity.parse(rawObj);
      assert.deepEqual(obj, { name: 'lq', babies: [{ name: 'a' }, { name: 'b' }] });
    });
  });

  describe('#toExample()', function() {
    it('should work', function() {
      let entity = new Entity({
        name: { type: 'string' },
        age: { type: 'number', default: 3 },
        gender: { type: 'number', example: 1 },
        birthday: { type: 'date', format: 'iso' },
        children: [{
          id: { type: 'string', default: 'a', example: 'b' },
          name: { type: 'string', example: 'name' },
        }]
      });

      let obj = entity.toExample();
      expect(obj).to.have.property('name', undefined);
      expect(obj).to.have.property('age', 3);
      expect(obj).to.have.property('gender', 1);
      expect(obj).to.have.property('birthday');
      assert.deepEqual(obj.children, [{ id: 'b', name: 'name' }]);
    });
  });

  describe('simplify usage syntax', function() {
    it('simpler type definition', function() {
      let childEntity = new Entity({
        id: String,
        name: String
      });

      let entity = new Entity({
        name: String,
        age: Number,
        isAdult: Boolean,
        birthday: Date,
        child: childEntity
      });
      let now = new Date();
      let rawObj = {
        name: 'lq',
        age: 24,
        isAdult: true,
        birthday: now,
        gender: 1,
        child: {
          id: 1,
          name: 'x'
        }
      };
      let obj = entity.parse(rawObj);

      expect(obj).to.have.property('name', 'lq');
      expect(obj).to.have.property('age', 24);
      expect(obj).to.have.property('isAdult', true);
      expect(obj).to.have.property('birthday', now);
      expect(obj).to.not.have.property('gender');
      expect(obj).to.have.nested.property('child.id', '1');
      expect(obj).to.have.nested.property('child.name', 'x');
    });

    it('set default value by using simpler type definition', function() {
      let now = new Date();

      let childEntity = new Entity({
        id: String,
        name: String
      });

      let entity = new Entity({
        name: String,
        age: Number,
        isAdult: Boolean,
        birthday: Date,
        child: childEntity,
        friend: {
          id: String,
          name: String
        }
      });
      let obj1 = entity.parse({});
      expect(obj1).to.have.property('name', undefined);
      expect(obj1).to.have.property('age', undefined);
      expect(obj1).to.have.property('isAdult', undefined);
      expect(obj1).to.have.property('birthday', undefined);
      expect(obj1).to.have.property('child', undefined);
      expect(obj1).to.have.property('friend', undefined);

      // set default type property
      let defaultObject = {};

      Entity.types = {
        string: { default: '' },
        number: { default: 0 },
        boolean: { default: false },
        date: { format: 'iso', default: now },
        object: { default: defaultObject }
      };
      let entity2 = new Entity({
        name: String,
        age: Number,
        isAdult: Boolean,
        birthday: Date,
        child: childEntity,
        friend: {
          id: String,
          name: String
        }
      });
      let obj2 = entity2.parse({});
      expect(obj2).to.have.property('name', '');
      expect(obj2).to.have.property('age', 0);
      expect(obj2).to.have.property('isAdult', false);
      expect(obj2).to.have.property('birthday', now.toISOString());
      expect(obj2).to.have.property('child', defaultObject);
      expect(obj2).to.have.property('friend', defaultObject);

      // reset
      Entity.types = undefined;
    });

    it('simpler default value', function() {
      let now = new Date();
      let justNow = new Date(now - 1000);

      let entity = new Entity({
        name: '',
        age: 0,
        isAdult: false,
        birthday: justNow
      });

      let rawObj = {
        name: 'lq',
        age: 24,
        isAdult: true,
        birthday: now,
        gender: 1,
        child: {
          id: 1,
          name: 'x'
        }
      };
      let obj = entity.parse(rawObj);
      expect(obj).to.have.property('name', 'lq');
      expect(obj).to.have.property('age', 24);
      expect(obj).to.have.property('isAdult', true);
      expect(obj).to.have.property('birthday', now);
      expect(obj).to.not.have.property('gender');
      expect(obj).to.not.have.property('child');

      let obj2 = entity.parse({});
      expect(obj2).to.have.property('name', '');
      expect(obj2).to.have.property('age', 0);
      expect(obj2).to.have.property('isAdult', false);
      expect(obj2).to.have.property('birthday', justNow);
    });

    it('all array entity default value should be []', function() {
      let childEntity = new Entity({
        id: 0,
        name: ''
      });

      let entity = new Entity({
        tags: [String],
        category: [0],
        children: [childEntity],
        friends: [{
          id: Number
        }]
      });

      let rawObj = {
        tags: ['a', 'b', 'c'],
        category: [1, 2, 3],
        children: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }],
        friends: [{ id: 0 }]
      };
      let obj = entity.parse(rawObj);
      assert.deepEqual(obj, rawObj);

      let obj1 = entity.parse({});
      assert.deepEqual(obj1, {
        tags: [],
        category: [],
        children: [],
        friends: []
      });
    });

    it ('Entity.renames', function() {
      Entity.renames = { _id: 'id' };
      let entity = new Entity({
        _id: '',
        name: '',
        child: {
          _id: String
        }
      });
      let rawObj = { _id: 'a', child: { _id: 'b' } };
      let obj = entity.parse(rawObj);
      expect(obj).to.have.property('id', 'a');
      expect(obj).to.have.property('name', '');
      expect(obj).to.not.have.property('_id');
      expect(obj).to.have.nested.property('child.id', 'b');
      expect(obj).to.not.have.nested.property('child._id');

      let entity2 = entity.pick('id');
      let obj2 = entity2.parse(rawObj);
      expect(obj2).to.have.property('id', 'a');
      expect(obj2).to.not.have.property('_id');
      expect(obj2).to.not.have.property('name');
      expect(obj2).to.not.have.nested.property('child._id');
      expect(obj2).to.not.have.nested.property('child.id');

      // reset
      Entity.renames = undefined;
    });
  });
});
