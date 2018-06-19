/**
 * Export
 */
module.exports = Entity;

/**
 * Module dependencies
 */
var Normalizer = require('baiji-normalizer');
var stoc = require('stoc');
var assert = require('assert');
var debug = require('debug')('baiji:entity');

/*!
 * toString function
 */
function toString(value) {
  return Object.prototype.toString.call(value);
}

/*!
 * Check object.
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type === 'object' || type === 'function');
}

/*!
 * Check string
 */
function isString(value) {
  return typeof value === 'string' ||
         (isObject(value) && toString(value) === '[object String]');
}

/*!
 * Check function
 */
function isFunction(value) {
  var tag = isObject(value) ? toString(value) : '';
  return tag === '[object Function]' || tag === '[object GeneratorFunction]';
}

/*!
 * Check date
 */
function isDate(value) {
  return isObject(value) && toString(value) === '[object Date]';
}

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
    isObject(val) ||
    isFunction(val);
}

/**
 * @method Check whether a object is sub entity
 * @param {true|String|Array|Object} obj
 * @return {Boolean}
 *
 * @api private
 */
function _mightBeSubEntity(obj) {
  if (obj === true || isFunction(obj)) return false;

  var _obj;

  if (isObject(obj)) _obj = obj;

  if (Array.isArray(obj)) {
    if (obj.length !== 1) return false;
    if (obj.length === 1 && isObject(obj[0])) _obj = obj[0];
  }

  if (!_obj) return false;

  if (_obj.using && Entity.isEntity(_obj.using)) return false;

  if (!_obj.type) return true;

  if (isString(_obj.type) || isString(_obj.type[0])) return false;

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
  var propNames = Object.keys(object);

  for (var i = 0; i < propNames.length; i++) {
    var key = propNames[i];

    var value = object[key];
    assert(
      _validateValue(value),
      'Entity definition: object value for key ' + key + ' is invalid, \'' + value + '\''
    );

    if (value === true) {
      this.add(key, { type: 'any' });
    } else if (isFunction(value)) {
      this.add(key, { type: 'any' }, value);
    } else {
      var _isArray = Array.isArray(value);
      var _isEntity = Entity.isEntity(_isArray ? value[0] : value);

      if (_mightBeSubEntity(value) || _isEntity) {
        this.add.apply(this, [key, {
          type: _isArray ? ['object'] : 'object',
          using: _isEntity ? (_isArray ? value[0] : value) : new Entity(_isArray ? value[0] : value),
          default: _isArray ? [] : null
        }]);
      } else {

        // [{ type: 'string' }] => { type: ['string] }
        if (_isArray && value.length === 1 && isObject(value[0])) {
          if (value[0].type && typeof value[0].type === 'string') {
            value[0].type = [value[0].type];
          }
        }

        this.add.apply(this, [key].concat(value));
      }
    }
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

  assert(isObject(object), object + ' is not a valid object');

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
  newEntity._mappings = Object.assign({}, entity._mappings);
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

  if (isObject(object)) _addFields.call(newEntity, object);

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
  return isObject(entity) && entity instanceof Entity;
};

/**
 * @method For Entity instance this always return true
 * @return {Boolean}
 *
 * @api public
 */
Entity.prototype.isEntity = function() {
  return this instanceof Entity;
};

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
 *     var entity = new Entity();
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
  var fields = Array.prototype.slice.call(arguments);
  assert(fields.length !== 0, 'fields should be provided');

  var self = this;

  var options = {};
  var fn;

  if (fields.length > 1) {
    // extract `fn`
    if (isFunction(fields[fields.length - 1])) {
      fn = fields.pop();
    }

    // extract `options`
    if (isObject(fields[fields.length - 1])) {
      var last = fields.pop();
      Object.assign(options, last);
    }

    // extract `fn` from `options.get`
    if (options.get) {
      assert(isFunction(options.get), 'options.get must be function');
      fn = options.get;
      delete options.get;
    }

    if (fields.length > 1) {
      assert(!options.as, 'using :as option on multi-fields exposure not allowed');
      assert(!fn, 'using function on multi-fields exposure not allowed');
    }
  }

  fields.forEach(function(field) {
    var act ='alias';
    var value = field;
    var defaultVal = undefined;
    var type = undefined;
    var format = undefined;
    var using = undefined;
    var ifFn = undefined;
    var example = undefined;

    assert(isString(field) && /^[a-zA-Z0-9_]+$/g.test(field), 'field ' + field + ' must be a string');
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
      assert(isFunction(options.if), 'if condition must be a function');
      ifFn = options.if;
    }

    if (options.using) {
      assert(Entity.isEntity(options.using), 'using must be an Entity');
      using = options.using;
    }


    if (!using && !ifFn) {
      var strType = Array.isArray(type) ? type[0] : type;
      if (!~['string', 'number', 'object', 'date', 'boolean'].indexOf(strType)) {
        throw new Error(`field ${field} missing type field or incorrect value`);
      }
    }

    if (options.as) {
      assert(isString(options.as), 'as must be a string');
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

  if (isString(fields)) {
    try {
      fields = stoc(fields);
    } catch(e) {
      throw new Error('failed parse string to object');
    }
  }

  if (!isObject(fields)) throw new Error('only accept object or string param');

  var keys = Object.keys(fields);
  if (!keys.length) {
    return this.clone();
  } else {
    var newEntity = new Entity();
    keys.forEach(key => {
      var fieldVal = this._mappings[key];

      if (fieldVal) {
        fieldVal = Object.assign({}, fieldVal);

        // sub-entity
        if (fieldVal.using) {
          assert(Entity.isEntity(fieldVal.using), 'using must be an Entity');
          fieldVal.using = fieldVal.using.pick(typeof fields[key] !== 'object' ? {} : fields[key]);
        }

        // change key's name
        var newKey = fields[key];
        if (typeof newKey === 'string') key = newKey;

        newEntity._mappings[key] = fieldVal;
      } else {
        throw new Error('confirm pick current fields');
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
  var originalObj;
  var result = {};
  var self = this;

  originalObj = obj == null ? {} : obj;

  if (typeof options === 'function') {
    converter = options;
    options = {};
  } else {
    options = options || {};
  }

  if (isString(options.fields)) {
    options.fields = stoc(options.fields);
  } else if (!isObject(options.fields) || !options.fields) {
    options.fields = Object.create(null);
  }

  // Avoid automatically coerce by Normalizer
  options = Object.assign({ coerce: false }, options);

  // Choose fields to be exposed
  var fields = Object.keys(options.fields);
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
        var o = self._mappings[key];
        if (!o) return;

        var val = undefined;

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

        var isDefaultValueApplied = false;
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
        val = isDate(val) && o.format ? _format(val, o.format) : val;

        // Normalize field value with Normalizer except value already parsed by another entity
        try {
          val = Normalizer.convert(val, o.type, options);
        } catch (err) {
          debug('[ERROR] -> ', err);
        }

        if (!isDefaultValueApplied && o.using) {
          var opts = Object.assign({}, options);
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
  var obj = {};
  var _mappings = this._mappings;

  this._keys.forEach(key => {
    var field = _mappings[key];

    var type = field.type;
    var _isArray = Array.isArray(type);

    if (field.using) {
      var val = field.using.toExample();
      if (_isArray) val = [val];
      obj[key] = val;
      return;
    }

    var val = field.example;
    if (val === undefined) {
      val = field.default;
      if (val === undefined) {
        if (_isArray) type = type[0];

        if (field.format) type = 'date';

        val = ({
          string: '',
          number: 0,
          object: null,
          date: new Date(),
          boolean: false,
        })[type];

        val = isDate(val) && field.format ? _format(val, field.format) : val;

        if (_isArray) val = [val];
      }
    }
    obj[key] = val;
  });

  return obj;
};
