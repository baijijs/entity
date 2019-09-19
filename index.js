/**
 * Export
 */
module.exports = Entity;

/**
 * Module dependencies
 */
const Normalizer = require('baiji-normalizer');
const stoc = require('stoc');
const assert = require('assert');
const _ = require('lodash');
const debug = require('debug')('baiji:entity');

/**
 * @method Validating method for Entity object value
 * @param {true|String|Array|Object} val
 * @return {Boolean}
 *
 * @api private
 */
function _validateValue(val) {
  if (val == null) return false;
  if (Array.isArray(val) && val.length === 0) return false;
  return true;
}

/**
 * help to validate type
 */
function guessType(type) {
  switch (type) {
    case String:
      return 'string';
    case Number:
      return 'number';
    case Boolean:
      return 'boolean';
    case Date:
      return 'date';
    default:
      return undefined;
  }
}

/**
 * @method Check whether a object is sub entity
 * @param {true|String|Array|Object} obj
 * @return {Boolean}
 *
 * @api private
 */
function _mightBeSubEntity(obj) {
  if (obj === true || _.isFunction(obj)) return false;

  let _obj;

  if (_.isObject(obj)) _obj = obj;

  if (Array.isArray(obj)) {
    if (obj.length !== 1) return false;
    if (obj.length === 1 && _.isObject(obj[0])) _obj = obj[0];
  }

  if (!_obj) return false;

  if (_obj.using && Entity.isEntity(_obj.using)) return false;

  if (!_obj.type) return true;

  if (_.isString(_obj.type) || _.isString(_obj.type[0])) return false;

  let _type = Array.isArray(_obj.type) ? _obj.type[0] : _obj.type;
  if (guessType(_type)) return false;

  return true;
}

/**
 * @method Add fields definition for Entity object
 * @param {Object} object
 * @return {undefined}
 *
 * @api private
 */
function _addFields(object) {
  let propNames = Object.keys(object);

  for (let i = 0; i < propNames.length; i++) {
    let key = propNames[i];

    let value = object[key];
    assert(
      _validateValue(value),
      'Entity definition: object value for key ' + key + ' is invalid, \'' + value + '\''
    );

    let _isArray = Array.isArray(value);
    if (_isArray && value.length > 1) {
      this.add.apply(this, [key].concat(value));
      continue;
    }

    let _val = _isArray ? value[0] : value;
    let _type = typeof _val;
    let options = {};
    let defaultTypes = _.assign({
      string: {},
      number: {},
      boolean: {},
      date: {},
      object: {}
    }, Entity.types);

    if (['string', 'number', 'boolean'].indexOf(_type) > -1) {
      options = { type: _type, default: _val };
    } else if (_type === 'function') {
      _type = guessType(_val);
      if (!_type) {
        this.add.apply(this, [key, _val]);
        continue;
      }
      options = { type: _type };
    } else {
      if (_val instanceof Date) {
        options = { type: 'date', default: _val };
      } else if (Entity.isEntity(_val)) {
        options = { type: 'object', using: _val };
      } else if (_mightBeSubEntity(_val)) {
        options = { type: 'object', using: new Entity(_val) };
      } else {
        options = _val;
      }
    }

    // add some default config
    if (options.type) {
      let strType;
      if (_.isString(options.type)) {
        strType = options.type;
      } else if (Array.isArray(options.type) && options.type.length > 0) {
        strType = options.type[0];
      }
      if (strType) options = _.assign({}, defaultTypes[options.type], options);
    }

    if (_isArray) {
      if (!Array.isArray(options.type)) options.type = [options.type];
      options.default = [];
    }
    this.add.apply(this, [key, options]);
  }
}

/**
 * @class Entity constructor for mapping schema object value with pre-defined object value for final return
 * @param {Object} object
 * @return {Entity}
 *
 * @api public
 */
function Entity(object) {
  if (!(this instanceof Entity)) return new Entity(object);

  this._mappings = {};
  this._keys = [];

  if (object === undefined) return;

  assert(_.isObject(object), object + ' is not a valid object');

  _addFields.call(this, object);

  return this;
}

/**
 * @method Format date
 * @param {Date} date
 * @param {String} format
 * @return {String|Number} date
 *
 * @api private
 */
let _format = function(date, format) {
  switch(format) {
    case 'iso':
      date = date.toISOString();
      break;
    case 'timestamp':
      date = date.getTime();
      break;
  }
  return date;
};

/**
 * @method Clone Entity object
 * @param {Entity} entity
 * @return {Entity}
 *
 * @api private
 */
function _cloneEntity(entity) {
  assert(Entity.isEntity(entity), 'entity must be a valid Entity object');

  let newEntity = new Entity();
  newEntity._mappings = _.assign({}, entity._mappings);
  newEntity._keys = entity._keys.slice();

  return newEntity;
}

/**
 * @method Clone provided Entity object
 * @param {Entity} entity
 * @return {Entity}
 *
 * @api public
 */
Entity.clone = function(entity) {
  return _cloneEntity(entity);
};

/**
 * @method An alias for clone method
 * @param {Entity} entity
 * @return {Entity}
 *
 * @api public
 */
Entity.copy = Entity.clone;

/**
 * @method Extend a new Entity object based on provided one and object
 * @param {Entity} entity
 * @param {Object} object, when object is not a valid Object instance, then fail silently
 * @return {Entity}
 *
 * @api public
 */
Entity.extend = function(entity, object) {
  let newEntity = _cloneEntity(entity);

  if (_.isObject(object)) _addFields.call(newEntity, object);

  return newEntity;
};

/**
 * @method Check whether an object is an Entity instance
 * @param {Entity} entity
 * @return {Boolean}
 *
 * @api public
 */
Entity.isEntity = function(entity) {
  return _.isObject(entity) && entity instanceof Entity;
};

/**
 * @method For Entity instance this always return true
 * @return {Boolean}
 *
 * @api public
 */
Entity.prototype.isEntity = function() { return true; };

/**
 * @method Clone self
 * @return {Entity}
 *
 * @api public
 */
Entity.prototype.clone = function() {
  return _cloneEntity(this);
};

/**
 * @method Get obj value by key, overwrite this method for special object
 * @param {Object} obj
 * @param {String} key
 * @return {Any}
 *
 * @api public
 */
Entity.prototype.get = function(obj, key) {
  return obj[key];
};

/**
 * @method Set obj value by key, overwrite this method for special object
 * @param {Object} obj
 * @param {String} key
 * @return {Null}
 *
 * @api public
 */
Entity.prototype.set = function(obj, key, value) {
  obj[key] = value;
};

/**
 * @method Check if obj is an array, overwrite this method for special object
 * @param {Object} obj
 * @return {Boolean}
 *
 * @api public
 */
Entity.prototype.isArray = function(obj) {
  return Array.isArray(obj);
};

/**
 * @method Add fields with corresponding value or function for final exposure, method could be chained
 *
 * @param {String} arg1, ..., argN
 * @param {Object} [] optional, options for manipulating schema object
 *
 * ####Options:
 *
 * - as: rename the field to exposure
 * - value: set specific value for field
 * - default: set default value for undefined field
 * - type: normalize field value according to type option, case ignored, see more at https://github.com/baijijs/normalizer
 * - format: only applied for valid Date value, which automatically turn type option to `string`, now support format of `iso` and `timestamp`, case ignored
 * - if: set a filter to determine if the field should be return, accept an object and return boolean
 * - using: use another Entity instance as the filed value
 *
 * ####Priority of options:
 * if -> Function/value -> default -> using
 *
 * @param {Function} [] optional, for further manipulation of inputed object according to options
 *
 * ####Example:
 *
 *     let entity = new Entity();
 *     entity.add('name', { type: 'string', as: 'fullname' });
 *     entity.add('age', { type: 'number', default: 0 });
 *     entity.add('sex', { type: 'string', value: 'male' });
 *     entity.add('isAdult', function(obj, options, key) { return obj && obj.age >= 18; });
 *     entity.add('activities', { type: ['object'], using: myActivityEntity });
 *     entity.add('extraInfo', { type: 'object', using: myExtraInfoEntity });
 *     entity.add('condition', { type: 'boolean', if: function(obj, options, key) { return true } });
 *
 * @return {Entity}
 *
 * @api public
 */
Entity.prototype.add = function() {
  let fields = Array.prototype.slice.call(arguments);
  assert(fields.length !== 0, 'fields should be provided');

  let self = this;

  let options = {};
  let fn;

  if (fields.length > 1) {
    // extract `fn`
    if (_.isFunction(fields[fields.length - 1])) {
      fn = fields.pop();
    }

    // extract `options`
    if (_.isObject(fields[fields.length - 1])) {
      let last = fields.pop();
      _.assign(options, last);
    }

    // extract `fn` from `options.get`
    if (options.get) {
      assert(_.isFunction(options.get), 'options.get must be function');
      fn = options.get;
      delete options.get;
    }

    if (fields.length > 1) {
      assert(!options.as, 'using :as option on multi-fields exposure not allowed');
      assert(!fn, 'using function on multi-fields exposure not allowed');
    }
  }

  fields.forEach(function(field) {
    let act ='alias';
    let value = field;
    let defaultVal = undefined;
    let type = undefined;
    let format = undefined;
    let using = undefined;
    let ifFn = undefined;
    let example = undefined;

    assert(_.isString(field) && /^[a-zA-Z0-9_]+$/g.test(field), 'field ' + field + ' must be a string');
    assert(!(options.as && fn), 'using :as option with function not allowed');
    assert(!(options.value && fn), 'using :value option with function not allowed');
    assert(!(options.value && options.as), 'using :value option with :as option not allowed');

    if (Array.isArray(options.type)) {
      type = [(options.type[0] || '').toLowerCase() || 'any'];
    } else {
      type = (options.type || '').toLowerCase() || 'any';
    }

    defaultVal = options.hasOwnProperty('default') ? options.default : defaultVal;

    if (options.example) {
      example = options.example;
    }

    if (options.format) {
      assert(/^iso$|^timestamp$/i.test(options.format), 'format must be one of ["iso", "timestamp"] value, case ignored');
      format = options.format.toLowerCase();
      type = 'string';
    }

    if (options.if) {
      assert(_.isFunction(options.if), 'if condition must be a function');
      ifFn = options.if;
    }

    if (options.using) {
      assert(Entity.isEntity(options.using), 'using must be an Entity');
      using = options.using;
    }


    if (!using && !ifFn) {
      let _isArray = Array.isArray(type);
      let strType = _isArray ? type[0] : type;
      if (!~['string', 'number', 'object', 'date', 'boolean'].indexOf(strType)) {
        strType = guessType(strType);
        if (strType) {
          type = _isArray ? [strType] : strType;
        } else {
          throw new Error(`field ${field} missing type field or incorrect value`);
        }
      }
    }

    if (options.as) assert(_.isString(options.as), 'as must be a string');

    if (options.as) {
      field = options.as;
    } else if (options.value) {
      act = 'value';
      value = options.value;
    } else if (fn) {
      act = 'function';
      value = fn;
    }

    // Entity.renames
    if ((Entity.renames || {})[field] && !options.as) {
      field = Entity.renames[field];
      assert(_.isString(field), 'any of Entity.renames key or value must be string type');
    }

    self._mappings[field] = {
      type: type,
      act: act,
      value: value,
      default: defaultVal,
      format: format,
      if: ifFn,
      using: using,
      example: example
    };
  });

  self._keys = Object.keys(self._mappings);

  return self;
};

/**
 * add function but safe
 */
Entity.prototype.safeAdd = function() {
  let entity = _cloneEntity(this);

  return entity.add.apply(entity, arguments);
};

/**
 * @method An alias for add method
 *
 * @param {String} arg1, ..., argN
 * @param {Object} [] optional, options for manipulating schema object
 *
 * ####Options:
 *
 * - as: rename the field to exposure
 * - value: set specific value for field
 * - default: set default value for undefined field
 * - type: normalize field value according to type option, case ignored, see more at https://github.com/baijijs/normalizer
 * - format: only applied for valid Date value, which automatically turn type option to `string`, now support format of `iso` and `timestamp`, case ignored
 * - if: set a filter to determine if the field should be return, accept an object and return boolean
 * - using: use another Entity instance as the filed value
 *
 * ####Priority of options:
 * if -> Function/value -> default -> using
 *
 * @param {Function} [] optional, for further manipulation of inputed object according to options
 *
 * ####Example:
 *
 *     let entity = new Entity();
 *     entity.expose('name');
 *     entity.expose('name', { as: 'fullname' });
 *     entity.expose('name', { type: 'string', as: 'fullname' });
 *     entity.expose('age', { default: 0 });
 *     entity.expose('sex', { value: 'male' });
 *     entity.expose('isAdult', function(obj) { return obj && obj.age >= 18; });
 *     entity.expose('activities', { using: myActivityEntity });
 *     entity.expose('extraInfo', { using: myExtraInfoEntity });
 *     entity.expose('condition', { if: function(obj, options) { return true } });
 *
 * @return {Entity}
 *
 * @api public
 */
Entity.prototype.expose = Entity.prototype.add;

/**
 * @method Unexpose certain field, used for extended entity
 * @param {String} arg1, ..., argN invalid arguments are ignored silently
 * @return {Entity}
 *
 * @api public
 */
Entity.prototype.remove = function() {
  let fields = Array.prototype.slice.call(arguments);
  let self = this;

  fields.forEach(function(field) {
    if (typeof field === 'string') {
      delete self._mappings[field];
    }
  });

  this._keys = Object.keys(this._mappings);

  return self;
};

/**
 * Entity.prototype.remove alias
 */
Entity.prototype.unexpose = Entity.prototype.remove;

/**
 * Entity.prototype.safeAdd alias
 */
Entity.prototype.safeExpose = Entity.prototype.safeAdd;


/**
 * pick fields from entity
 * @param {Object|String} fields
 * @return {Entity}
 */
Entity.prototype.pick = function(fields) {

  // null and undefined => {}
  if (fields == null) fields = {};

  if (_.isString(fields)) {
    try {
      fields = stoc(fields);
    } catch(e) {
      throw new Error('failed parse string to object');
    }
  }

  if (!_.isObject(fields)) throw new Error('only accept object or string param');

  let keys = Object.keys(fields);
  if (!keys.length) {
    return this.clone();
  } else {
    let newEntity = new Entity();
    keys.forEach(key => {
      let fieldVal = this._mappings[key];

      if (fieldVal) {
        fieldVal = _.assign({}, fieldVal);

        // change key's name
        let newKey = fields[key];
        if (typeof newKey === 'string') key = newKey;

        // sub-entity
        if (fieldVal.using) {
          assert(Entity.isEntity(fieldVal.using), 'using must be an Entity');
          fieldVal.using = fieldVal.using.pick(typeof fields[key] !== 'object' ? {} : fields[key]);
        }

        newEntity._mappings[key] = fieldVal;
      } else {
        let isRename = keys.some(k => fields[k] === key);
        if (!isRename) throw new Error('confirm pick current fields');
      }
    });
    newEntity._keys = Object.keys(newEntity._mappings);
    return newEntity;
  }
};


/**
 * @method Parse input object according to Entity exposure definition
 * @param {Object} obj
 * @param {Object} [options] optional
 *
 * #### Options:
 *
 * - overwrite: for fields with value of undefined, if default value is provided from Entity definition, then set this field value of input object with default value
 * - fields: allow to choose fields via `id name profile(gender)`
 *
 * @param {Function} [converter] accept field value and options, return computed value
 * @return {Object} return computed key value pairs
 *
 * @api public
 */
Entity.prototype.parse = function(obj, options, converter) {
  debug('parsing %j with options %j and converter', obj, options);
  let originalObj;
  let result = {};
  let self = this;

  originalObj = obj == null ? {} : obj;

  if (typeof options === 'function') {
    converter = options;
    options = {};
  } else {
    options = options || {};
  }

  if (_.isString(options.fields)) {
    try {
      options.fields = stoc(options.fields);
    } catch (e) {
      throw new Error('failed parse string to object');
    }
  } else if (!_.isObject(options.fields) || !options.fields) {
    options.fields = Object.create(null);
  }

  // Avoid automatically coerce by Normalizer
  options = _.assign({ coerce: false }, options);

  // Choose fields to be exposed
  let fields = Object.keys(options.fields);
  fields = fields.length ? fields : self._keys;

  if (self.isArray(originalObj)) {
    // When obj is an Array, loop through it
    result = originalObj.map(function(o) {
      return self.parse(o, options, converter);
    });
    return result;
  } else {
    if (self._keys.length === 0) {
      // Just return when no exposure
      return result;
    } else {
      fields.forEach(function(key) {
        let o = self._mappings[key];
        if (!o) return;

        let val = undefined;

        if (o.if && !o.if(originalObj, options, key)) {
          return;
        }

        switch(o.act){
          case 'function':
            try {
              val = o.value(originalObj, options, key);
            } catch(err) {
              debug('[ERROR] -> ', err);
              val = undefined;
            }
            break;
          case 'alias':
            val = self.get(originalObj, o.value);
            break;
          case 'value':
            val = o.value;
            break;
        }

        let isDefaultValueApplied = false;
        // if value is `null`, `undefined`, set default value
        if (val == null) {
          val = o.default;
          if (options.overwrite) {
            self.set(originalObj, key, val);
          }
          isDefaultValueApplied = true;
        }

        if (converter && typeof converter === 'function') {
          val = converter(val, options, key);
        }

        // apply format for valid Date object
        val = _.isDate(val) && o.format ? _format(val, o.format) : val;

        // Normalize field value with Normalizer except value already parsed by another entity
        try {
          val = Normalizer.convert(val, o.type, options);
        } catch (err) {
          debug('[ERROR] -> ', err);
        }

        // change key's name
        let newKey = options.fields[key];
        if (typeof newKey === 'string') key = newKey;

        if (!isDefaultValueApplied && o.using) {
          let opts = _.assign({}, options);
          delete opts.fields;
          opts.fields = options.fields[key] || {};
          val = o.using.parse(val, opts, converter);
        }

        result[key] = val;
      });

      return result;
    }
  }
};


/**
 * output example object
 * @return {Object} plain object
 */
Entity.prototype.toExample = function() {
  let obj = {};
  let _mappings = this._mappings;

  this._keys.forEach(key => {
    let field = _mappings[key];

    let type = field.type;
    let _isArray = Array.isArray(type);
    let val;

    if (field.using) {
      val = field.using.toExample();
      if (_isArray) val = [val];
      obj[key] = val;
      return;
    }

    val = field.example;
    if (val === undefined) {
      val = field.default;
      if (val === undefined) {
        if (_isArray) type = type[0];

        if (field.format) type = 'date';

        let defaultTypes = Entity.types || {};
        val = (defaultTypes[type] || {}).default;

        val = _.isDate(val) && field.format ? _format(val, field.format) : val;

        if (_isArray) val = [val];
      }
    }
    obj[key] = val;
  });

  return obj;
};
