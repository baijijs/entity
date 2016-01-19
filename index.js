/**
 * Export
 */
module.exports = Entity;

/**
 * Module dependencies
 */
var util = require('util');
var assert = require('assert');
var Normalizer = require('baiji-normalizer');
var debug = require('debug')('baiji:entity');

/**
 * @method Validating method for Entity object value
 * @param {true|String|Array|Object} val
 * @return {Boolean}
 *
 * @api private
 */
function _validateValue(val) {
  return val === true ||
    Array.isArray(val) ||
    util.isObject(val) ||
    util.isFunction(val);
}

/**
 * @class Entity constructor for mapping schema object with pre-defined object value for final return
 * @param {Object} object
 * @return {Entity}
 *
 * @api public
 */
function Entity(object) {
  this._mappings = {};
  this._keys = [];

  if (object === undefined) return;

  assert(util.isObject(object), `${object} is not a valid object`);

  var value;
  for (var key in object) {
    if (object.hasOwnProperty(key)) {
      value = object[key];
      assert(_validateValue(value), `Entity Define: object value for key ${key} is invalid, '${value}'`);

      if (value === true) {
        this.add(key);
      } else if (Array.isArray(value)){
        value.unshift(key);
        this.add.apply(this, value);
      } else {
        this.add.apply(this, [key, value]);
      }
    }
  }
  return this;
}

/**
 * @method Extend a new Entity object based on provided one
 * @param {Entity} entity
 * @return {Entity} return a new Entity object
 *
 * @api public
 */
Entity.extend = function(entity) {
  assert(Entity.isEntity(entity), 'entity must be a valid Entity object');

  var newEntity = new Entity();
  newEntity._mappings = Object.assign({}, entity._mappings);
  newEntity._keys = entity._keys.slice();
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
  return !!(util.isObject(entity) && util.isFunction(entity.isEntity) && this.prototype.isEntity.call(entity));
};

/**
 * @method For Entity instance this always return true
 * @param {any} entity
 * @return {Boolean}
 *
 * @api public
 */
Entity.prototype.isEntity = function(entity) {
  return this instanceof Entity;
};

/**
 * @method Add Entity name or names with corresponding value or function for final exposure, add could be chained
 *
 * @param {String} arg1, ..., argN
 * @param {Object} [] optional, options for manipulating schema object
 *
 * ####Options:
 *
 * - as: rename the property to exposure
 * - value: set specific value for property
 * - default: set default value for null or undefined
 * - type: normalize property value according tytpe option, see more at https://github.com/baijijs/normalizer
 * - if: set a filter for property return/display, accept an object and return boolean
 * - using: use another Entity instance as the property value
 * 
 * ####Priority of options:
 * if -> Function/value -> default -> using
 *
 * @param {Function} [] optional, for further manipulation of inputed object according to options
 *
 * ####Example:
 *
 *     var entity = new Entity();
 *     entity.add('name');
 *     entity.add('name', { as: 'fullname' });
 *     entity.add('name', { type: 'string', as: 'fullname' });
 *     entity.add('sex', { value: 'male' });
 *     entity.add('isAdult', function(obj) { return obj && obj.age >= 18; });
 *     entity.add('activities', { using: myActivityEntity });
 *     entity.add('extraInfo', { using: myExtraInfoEntity });
 *     entity.add('condition', { if: function(obj, options) { return true } });
 *
 * @return {Entity}
 *
 * @api public
 */
Entity.prototype.add = function() {
  var fields = Array.prototype.slice.call(arguments);
  assert(fields.length !== 0, 'fields should be provided');

  var self = this;

  var options = {};
  var fn;

  if (fields.length > 1) {
    // extract `fn`
    if (util.isFunction(fields[fields.length - 1])) {
      fn = Array.prototype.pop.call(fields);
    }

    // extract `options`
    if (util.isObject(fields[fields.length - 1])) {
      var last = Array.prototype.pop.call(fields);
      var names = Object.getOwnPropertyNames(last);
      Object.assign(options, last);
    }

    if (fields.length > 1) {
      assert(!options.as, 'using :as option on multi-fields exposure not allowed');
      assert(!fn, 'using function on multi-attribute exposure not allowed');
    }
  }

  fields.forEach(function(field) {
    var act ='alias';
    var value = field;
    var defaultVal = null;
    var type = null;
    var using = null;
    var ifFn = null;

    assert(util.isString(field) && /^[a-zA-Z0-9_]+$/g.test(field), `field ${field} must be a string`);
    assert(!(options.as && fn), 'using :as option with function not allowed');
    assert(!(options.value && fn), 'using :value option with function not allowed');
    assert(!(options.value && options.as), 'using :value option with :as option not allowed');

    if (Array.isArray(options.type)) {
      type = [options.type[0] || 'any'];
    } else {
      type = options.type || 'any';
    }

    defaultVal = options.default || null;

    if (options.if) {
      assert(util.isFunction(options.if), 'if condition must be a function');
      ifFn = options.if;
    }

    if (options.using) {
      assert(Entity.isEntity(options.using), 'using must be an Entity');
      using = options.using;
    }

    if (options.as) {
      assert(util.isString(options.as), 'as must be a String');
    }

    if (options.as) {
      field = options.as;
    } else if (options.value) {
      act = 'value';
      value = options.value;
    } else if (fn) {
      act = 'function';
      value = fn;
    }

    self._mappings[field] = {
      type: type,
      act: act,
      value: value,
      default: defaultVal,
      if: ifFn,
      using: using
    };
  });

  self._keys = Object.keys(self._mappings);
  return self;
};

/**
 * @method An alias for add method
 */
Entity.prototype.expose = Entity.prototype.add;

/**
 * @method Unexpose certain property, used for extended entity
 * @param {String} arg1, ..., argN invalid arguments are ignored silently
 * @return {Entity}
 *
 * @api public
 */
Entity.prototype.unexpose = function() {
  var fields = Array.prototype.slice.call(arguments);
  fields.forEach(function(field, key) {
    if (typeof field === 'string') {
      delete this._mappings[field];
    }
  }, this);
  this._keys = Object.keys(this._mappings);
  return this;
};

/**
 * @method Parse input object according to Entity exposure definition
 * @param {Object} obj
 * @param {Object} [options] optional
 *
 * ####Options:
 *
 * - overwrite: for property with value of null or undefined, if default value is provided from Entity definition, then set this property value of input object with default value
 *
 * @param {Function} [converter] accept property value and options, return computed value
 * @return {Object} return computed key value pairs
 *
 * @api public
 */
Entity.prototype.parse = function(obj, options, converter) {
  debug('parsing %j with options %j and converter', obj, options);
  var originalObj;
  var result = {};
  var self = this;

  originalObj = util.isNullOrUndefined(obj) ? {} : obj;

  if (util.isFunction(options)) {
    converter = options;
  }

  if (!util.isObject(options)) {
    options = {};
  }

  if (Array.isArray(originalObj)) {
    // if obj is an Array, then loop it
    result = originalObj.map(function(obj) {
      return self.parse(obj, options, converter);
    });
    return result;
  } else {
    if (self._keys.length === 0) {
      // if no exposes, return
      return result;
    } else {
      self._keys.forEach(function(key) {
        var o = self._mappings[key];
        var val = null;

        if (o.if && !o.if(originalObj, options)) {
          return;
        }

        switch(o.act){
          case 'function':
            try {
              val = o.value(originalObj, options);
            } catch(err) {
              debug('[ERROR] -> ', err);
              val = null;
            }
            break;
          case 'alias':
            val = originalObj[o.value];
            break;
          case 'value':
            val = o.value;
            break;
        }

        var isDefaultValueApplied = false;
        // if value is `null`, `undefined`, set default value
        if (util.isNullOrUndefined(val)) {
          val = o.default;
          if (options.overwrite) {
            obj[key] = val;
          }
          isDefaultValueApplied = true;
        }

        if (converter && util.isFunction(converter)) {
          val = converter(val, options);
        }

        if (!isDefaultValueApplied && o.using) {
          val = o.using.parse(val, options, converter);
        }

        // cast type according to predefined dynamic converters
        try {
          val = Normalizer.convert(val, o.type, options);
        } catch (err) {
          debug('[ERROR] -> ', err);
        }

        result[key] = val;
      });
      return result;
    }
  }
};
