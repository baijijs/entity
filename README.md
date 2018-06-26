Baiji Entity
============

[![Build Status](https://travis-ci.org/baijijs/entity.svg)](https://travis-ci.org/baijijs/entity)

Expose API fields for endpoint user

# Usage

## Installation

```bash
npm install baiji-entity
```

## Global config

If you want to use more Simpler type definition, we suggest you set `Entity.types` and `Entity.renames` at project initialization.

### Entity.types

Set default values to different types. If don't set this property, all types default value would be `undefined`.

Attention only the `date` type has `format` propery, other types only have `default` property.

And `format` property have two limit values: `iso` and `timestamp`.

```javascript
Entity.types = {
  string: { default: '' },
  number: { default: 0 },
  boolean: { default: false },
  date: { format: 'iso', default: '' },
  object: { default: {} }
};
```

### Entity.renames

Set default config to change one key name to another.

```javascript
Entity.renames = { _id: 'id' };
const entity = new Entity({
  _id: String
});
console.log(entity.parse({}));
// output => { id: '' }
```

Same effect as:

```javascript
const entity = new Entity({
  _id: { type: 'string', as: 'id', default: '' }
});
console.log(entity.parse({}));
// output => { id: '' }
```

## API

#### Entity(object)

Define a new Entity object with object

The object's key and value pairs are the same as field and options pairs from .add method

##### Normal Definition

``` javascript
const Entity = require('baiji-entity');

const entity = new Entity({
  name: { type: 'string' },
  sex: { type: 'number', as: 'gender' },
  age: { type: 'number', default: 18 },
  isAdult: {
    type: 'boolean',
    get(obj) {
      return obj.age >= 18 ? true : false;
    }
  },
  girlfriend: {
    type: 'boolean',
    default: true,
    if: function(obj) {
      return obj.age >= 16 ? true : false;
    }
  },
  social: {
    type: 'object',
    using: SomeEntity,
    get(obj, options) {
      return {};
    }
  }
});
```

##### Simpler Definition

You can use the simpler syntax to define an entity. Attention please set [Global config](#global-config) at project initialization.

```javascript
const Entity = require('baiji-entity');
const entity = new Entity({
  // like: { type: 'string', as: 'id', default: '' }
  _id: String,
  // like: { type: 'string', default: '' }
  name: String,
  // like: { type: 'number', default: 0 }
  age: Number,
  // like: { type: 'date', format: 'iso', default: '' }
  birthday: Date
});

// Or you can have a different default value
const entity = new Entity({
  // like: { type: 'string', default: 'baiji' }
  name: 'baiji',
  // like: { type: 'number', default: 10 }
  age: 10,
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

#### .prototype.pick(string|object)

Pick specific fields from current entity, return a new entity

```javascript
const entity = new Entity({
  id: String,
  name: String,
  age: Number,
  children: [{
    id: String,
    sex: Number
  }]
});

const pickedEntity = entity.pick('id name children{ id }');
/**
 * => entity
 * {
 *   id: String,
 *   name: String,
 *   children: [{ id: String }]
 * }
 */
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
  - get: function, for further manipulation of inputed object according to options

fn optional, for further manipulation of inputed object according to options

``` javascript
let entity = new Entity();
entity.add('name', { type: 'string' });
entity.add('name', { type: 'string', as: 'fullname' });
entity.add('sex', { type: 'number', value: 'male' });
entity.add('isAdult', { type: 'boolean' }, function(obj) { return obj && obj.age >= 18; });
entity.add('isAdult', { type: 'boolean', get(obj) { return obj && obj.age >= 18; } });
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
// Require baiji-entity module
const Entity = require('baiji-entity');

// Define userEntity
const userEntity = new Entity({
  name: { type: 'string' },
  city: { type: 'string' },
  age: { type: 'number', default: 0 },
  gender: { type: 'string', default: 'unknown' },
  isAdult: [{ type: 'boolean', default: false }, function(obj, options) {
    return (obj && obj.age >= 18 ? true : false);
  }],
  points: { type: 'number', value: 100, if: function(obj, options) { return obj && obj.age >= 18; } },
  description: { as: 'introduction', type: 'string', default: '' },
  isSignedIn: {
    type: 'boolean',
    get(obj, options) {
      return (options && options.isSignedIn ? true : false);
    }
  },
  birthday: { default: '', type: 'date', format: 'iso' }
});

// Parse source data
userEntity.parse({
  name: 'Felix Liu',
  age: 18,
  city: 'Shanghai',
  birthday: new Date('2015-10-10 10:00:00'),
  description: 'A programmer who lives in Shanghai',
  password: 'xxxxxxx'
}, { isSignedIn: true });

// The parsed output will be as below ⬇️

{
  name: 'Felix Liu',
  city: 'Shanghai',
  age: 18,
  gender: 'unknown',
  isAdult: true,
  points: 100,
  introduction: 'A programmer who lives in Shanghai',
  isSignedIn: true,
  birthday: '2015-10-10T02:00:00.000Z'
}
```

# License

MIT
