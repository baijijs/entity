/**
 * Export
 */
module.exports = Entity;

/**
 * Module dependencies
 */
var Normalizer = require('baiji-normalizer');
var bue = require('bue');
var assert = bue.assert;
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
    bue.isObject(val) ||
    bue.isFunction(val);
}

/**
 * @method Add fields definition for Entity object
 * @param {Object} object
 * @return {undefined}
 *
 * @api private
 */
function _addFields(object) {
  var self = this;
  var value;
  var propNames = Object.getOwnPropertyNames(object);

  propNames.forEach(function(key) {
    value = object[key];
    assert(_validateValue(value), `Entity Define: object value for key ${key} is invalid, '${value}'`);

    if (value === true) {
      self.add(key);
    } else if (Array.isArray(value)){
      value.unshift(key);
      self.add.apply(self, value);
    } else {
      self.add.apply(self, [key, value]);
    }
  });
}

/**
 * @class Entity constructor for mapping schema object value with pre-defined object value for final return
 * @param {Object} object
 * @return {Entity}
 *
 * @api public
 */
function Entity(object) {
  this._mappings = {};
  this._keys = [];

  if (object === undefined) return;

  assert(bue.isObject(object), `${object} is not a valid object`);

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
var _format = function(date, format) {
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

  var newEntity = new Entity();
  newEntity._mappings = bue.extend({}, entity._mappings);
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
  var newEntity = _cloneEntity(entity);

  if (bue.isObject(object)) {
    _addFields.call(newEntity, object);
  }

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
  return !!(bue.isObject(entity) && bue.isFunction(entity.isEntity) && this.prototype.isEntity.call(entity));
};

/**
 * @method For Entity instance this always return true
 * @param {any} entity
 * @return {Boolean}
 *
 * @api public
 */
Entity.prototype.isEntity = function() {
  return this instanceof Entity;
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
 *     var entity = new Entity();
 *     entity.add('name');
 *     entity.add('name', { as: 'fullname' });
 *     entity.add('name', { type: 'string', as: 'fullname' });
 *     entity.add('age', { default: 0 });
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
    if (bue.isFunction(fields[fields.length - 1])) {
      fn = Array.prototype.pop.call(fields);
    }

    // extract `options`
    if (bue.isObject(fields[fields.length - 1])) {
      var last = Array.prototype.pop.call(fields);
      Object.assign(options, last);
    }

    if (fields.length > 1) {
      assert(!options.as, 'using :as option on multi-fields exposure not allowed');
      assert(!fn, 'using function on multi-fields exposure not allowed');
    }
  }

  bue.each(fields, function(field) {
    var act ='alias';
    var value = field;
    var defaultVal = null;
    var type = null;
    var format = null;
    var using = null;
    var ifFn = null;

    assert(bue.isString(field) && /^[a-zA-Z0-9_]+$/g.test(field), `field ${field} must be a string`);
    assert(!(options.as && fn), 'using :as option with function not allowed');
    assert(!(options.value && fn), 'using :value option with function not allowed');
    assert(!(options.value && options.as), 'using :value option with :as option not allowed');

    if (Array.isArray(options.type)) {
      type = [String.prototype.toLowerCase.call(options.type[0] || 'any')];
    } else {
      type = String.prototype.toLowerCase.call(options.type || 'any');
    }

    defaultVal = options.hasOwnProperty('default') ? options.default : null;

    if (options.format) {
      assert(/^iso$|^timestamp$/i.test(options.format), 'format must be one of ["iso", "timestamp"] value, case ignored');
      format = options.format.toLowerCase();
      type = 'string';
    }

    if (options.if) {
      assert(bue.isFunction(options.if), 'if condition must be a function');
      ifFn = options.if;
    }

    if (options.using) {
      assert(Entity.isEntity(options.using), 'using must be an Entity');
      using = options.using;
    }

    if (options.as) {
      assert(bue.isString(options.as), 'as must be a string');
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
      format: format,
      if: ifFn,
      using: using
    };
  });

  self._keys = Object.keys(self._mappings);
  return self;
};

/**
 * add function but safe
 */
Entity.prototype.safeAdd = function() {
  var entity = _cloneEntity(this);

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
 *     var entity = new Entity();
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
  var fields = Array.prototype.slice.call(arguments);
  var self = this;

  bue.each(fields, function(field) {
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
 * @method Parse input object according to Entity exposure definition
 * @param {Object} obj
 * @param {Object} [options] optional
 *
 * ####Options:
 *
 * - overwrite: for fields with value of undefined, if default value is provided from Entity definition, then set this field value of input object with default value
 *
 * @param {Function} [converter] accept field value and options, return computed value
 * @return {Object} return computed key value pairs
 *
 * @api public
 */
Entity.prototype.parse = function(obj, options, converter) {
  debug('parsing %j with options %j and converter', obj, options);
  var originalObj;
  var result = {};
  var self = this;

  originalObj = bue.isNullOrUndefined(obj) ? {} : obj;

  if (bue.isFunction(options)) {
    converter = options;
  }

  if (!bue.isObject(options)) {
    options = {};
  }

  if (Array.isArray(originalObj)) {
    // When obj is an Array, loop through it
    result = originalObj.map(function(obj) {
      return self.parse(obj, options, converter);
    });
    return result;
  } else {
    if (self._keys.length === 0) {
      // Just return when no exposure
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
        if (bue.isNullOrUndefined(val)) {
          val = o.default;
          if (options.overwrite) {
            obj[key] = val;
          }
          isDefaultValueApplied = true;
        }

        if (converter && bue.isFunction(converter)) {
          val = converter(val, options);
        }

        if (!isDefaultValueApplied && o.using) {
          val = o.using.parse(val, options, converter);
        }

        // apply format for valid Date object
        val = bue.isDate(val) && o.format && _format(val, o.format) || val;

        // Normalize field value with Normalizer
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
