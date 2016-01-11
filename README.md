Baiji Entity
============

[![Build Status](https://travis-ci.org/baijijs/entity.svg)](https://travis-ci.org/baijijs/entity)

Expose API fields for endpoint user

# Usage

## Installation

```bash
npm install baiji-entity
```

## API

#### Entity(object)
Define a new Entity object with object

The object key and value pairs is the same as field and options pairs from .add method
```
var newEntity = new Entity({
  name: true,
  sex: { as: 'gender' },
  age: { default: 18 },
  isAdult: function(obj) { return obj.age >= 18 ? true : false; },
  girlfriend: { default: true, if: function(obj) { return obj.age >= 16 ? true : false; } },
  social: [{ using: SomeEntity }, function(obj, options) { return {}; }]
});
```

#### .isEntity(entity)
Check if entity is an instance of Entity object

```
Entity.isEntity(newEntity);
```

#### .add(field1[, field2, ..., fieldn, options, fn])
Define entity one by one

field name is constructed by characters of a-zA-Z0-9 and _

valid options described as below:
  as => set an alias name for field to expose
  type => set validation type for exposed field
  value => set expose value for exposed field
  default => set default value for exposed field
  if => set a filter for exposed field
  using => set another Entity object as sub-entity

fn is used to computing final exposed field value

```javascript
var entity = new Entity();
entity.add('name');
entity.add('name', { as: 'fullname' });
entity.add('name', { type: 'string', as: 'fullname' });
entity.add('sex', { value: 'male' });
entity.add('isAdult', function(obj) { return obj && obj.age >= 18; });
entity.add('activities', { using: myActivityEntity });
entity.add('extraInfo', { using: myExtraInfoEntity });
entity.add('condition', { if: function(obj, options) { return true } });
```

#### .expose
An alias for .add method

#### .parse(object[, options, converter])
Parse an input object with pre-defined Entity

## Usage
```javascript
var Entity = require('baiji-entity');

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

// The parsed output would be
var user = {
  name: 'Felix Liu',
  age: 18,
  city: 'Shanghai',
  gender: 'unknown',
  isAdult: true,
  state: 'Shanghai',
  points: 100,
  birthday: Date('2015-10-10 10:00:00'),
  introduction: 'A programmer who lives in Shanghai'
  isSignedIn: false
};
```

# License

MIT
