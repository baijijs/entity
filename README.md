Baiji Entity
============

[![Build Status](https://travis-ci.org/baijijs/entity.svg)](https://travis-ci.org/baijijs/entity)

Lead Maintainer: [Nick Jiang](https://github.com/nick-jiang)

Expose API fields for endpoint user

# Usage

## Installation

```bash
npm install baiji-entity
```

## API

#### Entity(object)
Define a new Entity object with object

The object's key and value pairs are the same as field and options pairs from .add method

``` javascript
const Entity = require('baiji-entity');

let entity = new Entity({
  name: true,
  sex: { as: 'gender' },
  age: { default: 18 },
  isAdult: function(obj) { return obj.age >= 18 ? true : false; },
  girlfriend: { default: true, if: function(obj) { return obj.age >= 16 ? true : false; } },
  social: { using: SomeEntity }, function(obj, options) { return {}; }
});
```

#### .isEntity(entity)
Check if an entity object is instance of Entity object

``` javascript
Entity.isEntity(entity);
```

#### .clone(entity)
Clone provided Entity object

``` javascript
Entity.clone(entity);
```

#### .copy(entity)
An alias for .clone method

``` javascript
Entity.copy(entity);
```

#### .extend(entity, object)
Extend a new Entity object based on provided one and object

``` javascript
Entity.extend(entity, { name: true });
```

#### .prototype.isEntity(entity)
For Entity instance this always return true

``` javascript
entity.isEntity(entity);
```

#### .prototype.add(field1[, field2, ..., fieldn, options, fn])
Add fields with corresponding value or function for final exposure, method could be chained

Options:
  - as: rename the field to exposure
  - value: set specific value for field
  - default: set default value for undefined field
  - type: normalize field value according to type option, case ignored, see more at https://github.com/baijijs/normalizer
  - format: only applied for valid Date value, which automatically turn type option to `string`, now support format of `iso` and `timestamp`, case ignored
  - if: set a filter to determine if the field should be return, accept an object and return boolean
  - using: use another Entity instance as the filed value

fn optional, for further manipulation of inputed object according to options

``` javascript
let entity = new Entity();
entity.add('name');
entity.add('name', { as: 'fullname' });
entity.add('name', { type: 'string', as: 'fullname' });
entity.add('sex', { value: 'male' });
entity.add('isAdult', function(obj) { return obj && obj.age >= 18; });
entity.add('activities', { using: myActivityEntity });
entity.add('extraInfo', { using: myExtraInfoEntity });
entity.add('condition', { if: function(obj, options) { return true } });
```

#### .prototype.safeAdd(field1[, field2, ..., fieldn, options, fn])
Same as .add function, return a new entity instead of modifying itself

#### .prototype.expose
An alias method for .add

#### .prototype.safeExpose
An alias method for .safeAdd

#### .prototype.unexpose
Unexpose certain field, used for extended entity

#### .prototype.parse(object[, options, converter])
Parse an input object according to Entity exposure definition

Options:
  - overwrite: for fields with value of undefined, if default value is provided from Entity definition, then set this field value of input object with default value

```javascript
let Entity = require('baiji-entity');

let UserEntity = new Entity();
UserEntity.add('name', 'city', { type: 'string' });
UserEntity.add('age', { type: 'number', default: 0 });
UserEntity.add('gender', { type: 'string', default: 'unknown' });
UserEntity.add('isAdult', { type: 'boolean', default: false }, function(obj, options) {
  return (obj && obj.age >= 18 ? true : false);
});
UserEntity.add('points', { value: 100, if: function(obj, options) {
  return obj && obj.age >= 18;
} });
UserEntity.add('description', { as: 'introduction', type: 'string', default: '' });
UserEntity.add('isSignedIn', function(obj, options) {
  return (options && options.isSignedIn ? true : false);
});
UserEntity.add('birthday', { default: '', type: 'date', format: 'iso' });

UserEntity.parse({
  name: 'Felix Liu',
  age: 18,
  city: 'Shanghai',
  birthday: new Date('2015-10-10 10:00:00'),
  description: 'A programmer who lives in Shanghai',
  password: 'xxxxxxx'
}, { isSignedIn: true });

// The parsed output will be as below:

{
  name: 'Felix Liu',
  age: 18,
  city: 'Shanghai',
  gender: 'unknown',
  isAdult: true,
  points: 100,
  birthday: '2015-10-10T02:00:00.000Z',
  introduction: 'A programmer who lives in Shanghai'
  isSignedIn: false
}
```

# License

MIT
