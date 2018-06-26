Baiji Entity
============

[![Build Status](https://travis-ci.org/baijijs/entity.svg)](https://travis-ci.org/baijijs/entity)

***A elegance way to restrict API outputs for any web frameworks.***

Baiji Entity gives you a simple schema for declaring JSON structures thats beats manipulating giant javascript object structures. This is particularly helpful when the generation process is fraught with conditionals and loops.

## Installation

```bash
npm install baiji-entity

# or

yarn add baiji-entity
```

## Example

``` javascript
const Entity = require('baiji-entity');

// presume we have a data object that needs to be parse
let article = {
  id: 1,
  content: 'article content ...',
  likesCount: 42,
  wordsCount: 12422,
  favoritesCount: 23,
  commentsCount: 578,
  visitors: 15,
  createdAt: 1530003456793,
  updatedAt: 1530008548865,
  author: {
    id: 789,
    name: 'Felix',
    email: 'lyfeyaj@gmail.com',
    articlesCount: 65,
    password: 'xxxxxxx'
  },
  comments: [
    {
      content: 'Hello everyone!',
      createdAt: '2018-03-29T20:45:28-08:00'
    },
    {
      content: 'To you my good sir!',
      createdAt: '2018-04-16T20:23:24-08:00'
    }
  ]
}

// define an article entity
let articleEntity = new Entity({
  id: Number,
  content: String,
  visitors: Number,
  createdAt: Date,
  updatedAt: Date,
  author: {
    name: String,
    email: String,
  },
  comments: [{
    content: String,
    createdAt: Date
  }]
});

// parse javascript object or some kind of data model likewise
articleEntity.parse(article);

// will generates below object:
{ id: 1,
  content: 'article content ...',
  visitors: 15,
  createdAt: '2018-06-26T08:57:36.793Z',
  updatedAt: '2018-06-26T10:22:28.865Z',
  author: {
    name: 'Felix', email: 'lyfeyaj@gmail.com'
  },
  comments: [
    {
      content: 'Hello everyone!',
      createdAt: '2018-03-30T04:45:28.000Z'
    },
    {
      content: 'To you my good sir!',
      createdAt: '2018-04-17T04:23:24.000Z'
    }
  ]
}

// Only those fields specified will be exposed and formatted
```

## Usage

### General configurations

Entity provide two global options that will help to simply the entity definition.

#### `Entity.types`

Set default values to different types, defaults are `undefined` for all kinds of types.

NOTE: Only `date` type has `format` property, other types only have `default` property.

And `format` property have two limit options: `iso` and `timestamp`.

Example:

```javascript
Entity.types = {
  string: { default: '' },
  number: { default: 0 },
  boolean: { default: false },
  date: { format: 'iso', default: '' },
  object: { default: {} }
};
```

#### `Entity.renames`

Set default config to alter one key's name to another.

Example:

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

### Defining Entities

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

### Static methods

#### `Entity.isEntity(entity)`
Check if an entity object is instance of Entity object

``` javascript
Entity.isEntity(entity);
```

#### `Entity.clone(entity)`
Clone provided Entity object

``` javascript
Entity.clone(entity);
```

#### `Entity.copy(entity)`
An alias for .clone method

``` javascript
Entity.copy(entity);
```

#### `Entity.extend(entity, object)`
Extend a new Entity object based on provided one and object

``` javascript
Entity.extend(entity, { name: true });
```

### Instance methods

#### `entity.isEntity(entity)`
For Entity instance this always return true

``` javascript
entity.isEntity(entity);
```

#### `entity.pick(string|object)`

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

#### `entity.add(field1[, field2, ..., fieldn, options, fn])`
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

#### `entity.safeAdd(field1[, field2, ..., fieldn, options, fn])`
Same as .add function, return a new entity instead of modifying itself

#### `entity.expose`
An alias method for .add

#### `entity.safeExpose`
An alias method for .safeAdd

#### `entity.unexpose`
Unexpose certain field, used for extended entity

#### `entity.parse(object[, options, converter])`
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

## License

MIT
