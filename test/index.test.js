var chai = require('chai');
var util = require('util');

var Entity = require('../');

var expect = chai.expect;

describe('Entity', function() {

  var SomeEntity, SomeOtherEntity;

  beforeEach(function() {
    SomeEntity = new Entity();
    SomeOtherEntity = new Entity();
  });

  describe('#constructor', function() {

    it('should be able to add fields via initialization', function() {
      var newEntity = new Entity({
        name: true,
        sex: { as: 'gender' },
        age: { default: 16 },
        isAdult: function(obj) { return obj.age >= 18 ? true : false; },
        girlfriend: { default: true, if: function(obj) { return obj.age >= 16 ? true : false; } },
        social: [{ using: SomeEntity }, function(obj, options) { return {}; }]
      });

      var obj1 = newEntity.parse({ name: 'Felix Liu', sex: 'male', age: 20, skype: 'mySkype' });
      var obj2 = newEntity.parse({ name: 'Felix Liu', sex: 'male' });
      var obj3 = newEntity.parse({ name: 'Felix Liu', sex: 'male' }, { overwrite: true });

      expect(obj1).to.have.property('name', 'Felix Liu');
      expect(obj1).to.have.property('gender', 'male');
      expect(obj1).to.have.property('age', 20);
      expect(obj1).to.have.property('isAdult', true);
      expect(obj1).to.have.property('girlfriend', true);
      expect(obj1).to.not.have.property('mySkype');
      expect(obj2).to.have.property('name', 'Felix Liu');
      expect(obj2).to.have.property('gender', 'male');
      expect(obj2).to.have.property('age', 16);
      expect(obj2).to.have.property('isAdult', false);
      expect(obj2).to.not.have.property('girlfriend');
      expect(obj3).to.have.property('girlfriend');
    });

    it('should be able to chain initialization', function() {
      var newEntity = new Entity({
        name: true
      })
      .add('sex', { as: 'gender' })
      .add('age', { default: 16 });

      var obj = newEntity.parse({ name: 'Felix Liu', sex: 'male' });

      expect(obj).to.have.property('name', 'Felix Liu');
      expect(obj).to.have.property('gender', 'male');
      expect(obj).to.have.property('age', 16);
    });

    it('should throw an error if fields value is invalid', function() {
      function initialize() {
        var object = {
          name: 'set a name'
        };
        return new Entity(object);
      }

      expect(initialize).to.throw(Error);
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

    it('should add multi-attribute', function() {
      var newEntity;
      var fn = function(){ newEntity = SomeEntity.add('name', 'age', 'gender'); };

      expect(fn).to.not.throw(Error);

      var obj = newEntity.parse({ name: 'Felix Liu', gender: 'male', age: 20 });

      expect(obj).to.have.property('name', 'Felix Liu');
      expect(obj).to.have.property('age', 20);
      expect(obj).to.have.property('gender', 'male');
    });

    it('should add multi-attribute with :default option', function() {
      var newEntity;
      var fn = function(){ newEntity = SomeEntity.add('name', 'age', 'gender', { default: 'default' }); };

      expect(fn).to.not.throw(Error);

      var obj = newEntity.parse({});

      expect(obj).to.have.property('name', 'default');
      expect(obj).to.have.property('age', 'default');
      expect(obj).to.have.property('gender', 'default');
    });

    it('should add multi-attribute with :if option', function() {
      var newEntity;
      var fn = function(){ newEntity = SomeEntity.add('name', 'age', 'gender', { if: function(obj){ return obj.age > 15; } }); };

      expect(fn).to.not.throw(Error);

      var obj = newEntity.parse({ name: 'Felix Liu', gender: 'male', age: 20 });

      expect(obj).to.have.property('name');
      expect(obj).to.have.property('age', 20);
      expect(obj).to.have.property('gender');
    });

    it('should add one attribute with :using option', function() {
      var infoEntity = new Entity({
        age: true,
        sex: { default: 'male' }
      });

      var newEntity = new Entity({
        name: true
      })
      .add('info', { using: infoEntity });

      var obj = newEntity.parse({ name: 'Felix Liu', info: { age: 20 } });

      expect(obj).to.have.property('name');
      expect(obj).to.have.deep.property('info.age', 20);
      expect(obj).to.have.deep.property('info.sex', 'male');
    });

    it('should throw an error when use :value option with function', function() {
      var fn = function() {
        SomeEntity.add('name', { value: 'myName' }, function(obj) { return obj; });
      };

      expect(fn).to.throw(Error);
    });

    it('should throw an error when use :value option with :as option', function() {
      var fn = function() {
        SomeEntity.add('name', { value: 'myName', as: 'myName' });
      };

      expect(fn).to.throw(Error);
    });

    it('should add one attribute with options or function', function() {
      SomeEntity.add('name', { using: SomeOtherEntity, as: 'fullName' });
      SomeEntity.add('age', { default: 20 }, function(obj, options) {
        return obj.age && obj.age * 2;
      });
      SomeEntity.add('gender', { default: 20, using: SomeOtherEntity }, function(obj, options) {
        return obj.gender && obj.gender === 1 ? 'male' : 'female';
      });

      var obj = SomeEntity.parse({ name: 'Felix Liu', age: 15, gender: 1 });

      expect(obj).to.not.have.property('name');
      expect(obj).to.have.property('fullName').to.be.empty;
      expect(obj).to.have.property('age', 30);
      expect(obj).to.have.property('gender').to.be.empty;
    });

    it('should throw an error if field name is not valid', function() {
      var fn = function() {
        var args = arguments;
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

    it('should throw an error when use function for multi-attribute', function() {
      var fn = function() {
        SomeEntity.add('name', 'age', 'gender', function(obj){ return obj; });
      };

      expect(fn).to.throw(Error);
    });

    it('should throw an error when use :as option for multi-attribute', function() {
      var fn = function() {
        SomeEntity.add('name', 'age', 'gender', { as: 'myName' });
      };

      expect(fn).to.throw(Error);
    });

    it('should throw an error when use :as option with function', function() {
      var fn = function() {
        SomeEntity.add('name', { as: 'myName' }, function(obj) { return obj; });
      };

      expect(fn).to.throw(Error);
    });

  });

  describe('#expose()', function() {
    it('should have the same functionalities of #add()', function() {
      expect(SomeEntity.expose.toString()).to.equal(SomeEntity.add.toString());
    });
  });

  describe('#parse(input, options, converter)', function() {
    var UserEntity, SocialEntity;

    beforeEach(function() {
      UserEntity = new Entity();
      UserEntity.add('name', 'city', { type: 'string' });
      UserEntity.add('age', { default: 0 });
      UserEntity.add('gender', { default: 'unknown' });
      UserEntity.add('isAdult', function(obj, options) {
        return (obj && obj.age >= 18 ? true : false);
      });
      UserEntity.add('points', { value: 100, if: function(obj, options) {
        return obj && obj.age >= 18;
      } });
      UserEntity.add('description', { as: 'introduction' });
      UserEntity.add('isSignedIn', function(obj, options) {
        return (options && options.isSignedIn ? true : false);
      });
      UserEntity.add('birthday', { default: new Date('2015-10-10 10:00:00') });

      UserEntity.add('hasGirlfriend', { type: 'boolean' });

      SocialEntity = new Entity();
      SocialEntity.add('qq', 'skype', 'facebook', 'twitter');

      UserEntity.add('social', { using: SocialEntity });
      UserEntity.add('habits', { type: ['string'] });
    });

    it('should only return exposed fields', function() {
      var user = {
        name: 'Felix Liu',
        age: 18,
        city: 'Shanghai',
        state: 'Shanghai'
      };

      var result = UserEntity.parse(user);
      expect(result).to.have.property('name', 'Felix Liu');
      expect(result).to.have.property('city', 'Shanghai');
      expect(result).to.have.property('age', 18);
      expect(result).to.not.have.property('state');
    });

    it('should return default value', function() {
      expect(UserEntity.parse({})).to.have.property('gender', 'unknown');
    });

    it('should return exposed fields by if confition and :value option', function() {
      var user = { age: 18 };
      var user1 = { age: 16 };

      expect(UserEntity.parse(user)).to.have.property('points', 100);
      expect(UserEntity.parse(user1)).to.not.have.property('points');
    });

    it('should return exposed fields value by function', function() {
      var user = { age: 18 };
      var user1 = { age: 16 };

      expect(UserEntity.parse(user)).to.have.property('isAdult', true);
      expect(UserEntity.parse(user1)).to.have.property('isAdult', false);
    });

    it('should return aliased fields', function() {
      var user = { description: 'A programmer who lives in Shanghai' };

      var result = UserEntity.parse(user);
      expect(result).to.have.property('introduction', user.description);
      expect(result).to.not.have.property('description');
    });

    it('should return fields based on options', function() {
      expect(UserEntity.parse({}, { isSignedIn: true })).to.have.property('isSignedIn', true);
      expect(UserEntity.parse({}, { isSignedIn: false })).to.have.property('isSignedIn', false);
    });

    it('should return subfields based on used Entity', function() {
      var user = { social: { qq: 66666666, skype: 'mySkype', facebook: 'myFacebook', twitter: 'myTwitter', tumblr: 'myTumblr' } };
      var user1 = { social: [{ qq: 66666666, skype: 'mySkype', facebook: 'myFacebook', twitter: 'myTwitter', tumblr: 'myTumblr' }] };

      var result = UserEntity.parse(user);
      var result1 = UserEntity.parse(user1);

      expect(result).to.have.deep.property('social.qq', user.social.qq);
      expect(result).to.have.deep.property('social.skype', user.social.skype);
      expect(result).to.have.deep.property('social.facebook', user.social.facebook);
      expect(result).to.have.deep.property('social.twitter', user.social.twitter);
      expect(result).to.not.have.deep.property('social.tumblr');

      expect(result1).to.have.deep.property('social[0].qq', user1.social[0].qq);
      expect(result1).to.have.deep.property('social[0].skype', user1.social[0].skype);
      expect(result1).to.have.deep.property('social[0].facebook', user1.social[0].facebook);
      expect(result1).to.have.deep.property('social[0].twitter', user1.social[0].twitter);
      expect(result1).to.not.have.deep.property('social[0].tumblr');
    });

    it('should convert field value based on converter', function() {
      var converter = function(val, options) {
        if (val instanceof Date) {
          return util.format('%s-%s-%s', val.getUTCFullYear(), val.getUTCMonth() + 1, val.getUTCDate());
        }
        return val;
      };

      expect(UserEntity.parse({}, converter)).to.have.property('birthday', '2015-10-10');
      expect(UserEntity.parse({}, {}, converter)).to.have.property('birthday', '2015-10-10');
    });

    it('should convert field value by it\'s type', function() {
      var user = {
        name: 123,
        habits: [123, true, 'pingpong'],
        hasGirlfriend: 'true'
      };

      var result = UserEntity.parse(user);
      expect(result).to.have.property('name', '123');
      expect(result).to.have.property('habits').eql(['123', 'true', 'pingpong']);
      expect(result).to.have.property('hasGirlfriend', true);
    });
  });

});
