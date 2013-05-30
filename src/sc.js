(function(global) {
  "use strict";

  var slice = [].slice;
  var conflicts = {
    Number  : [],
    Boolean : [],
    Array   : ["indexOf","every","concat","reverse","pop"],
    String  : [],
    Function: []
  };

  var sc = function(that) {
    var key, args;
    if (typeof that === "string") {
      key  = that;
      args = slice.call(arguments, 1);
      return function(that) {
        return that[key].apply(that, args.concat(slice.call(arguments, 1)));
      };
    }
    return function() { return this; };
  };
  var make_sc_function = function(klass, func) {
    if (typeof klass === "string") {
      return function(that) {
        return that[klass].apply(that, slice.call(arguments, 1));
      };
    } else {
      return function() {
        var args = slice.call(arguments);
        if (args[0] instanceof klass) {
          return func.apply(args[0], args.slice(1));
        }
        return null;
      };
    }
  };
  sc.define = function(name, deps, payload) {
    if (arguments.length === 2) {
      payload = deps;
      deps    = null;
    }
    if (typeof payload === "function") {
      payload = payload(sc);
    }
    register(name, payload);
  };

  var register = function(key, opts) {
    var klassname, klass, func;
    if (Array.isArray(key)) {
      return key.forEach(function(key) { register(key, opts); });
    }
    sc[key] = make_sc_function(key);
    for (klassname in opts) {
      klass = global[klassname];
      func  = opts[klassname];
      if (typeof klass !== "function") { continue; }
      if (/^\*\w+$/.test(key)) {
        key = key.substr(1);
        if (!klass[key]) {
          klass[key] = func;
        } else {
          console.warn("conflict: " + klassname + "." + key);
        }
      } else {
        if (!klass.prototype[key]) {
          klass.prototype[key] = func;
        } else {
          if (conflicts[klassname].indexOf(key) === -1) {
            console.warn("conflict: " + klassname + "#" + key);
          }
        }
        if (!klass[key]) {
          klass[key] = make_sc_function(klass, func);
        }
      }
    }
  };
  sc.func = function(arg) {
    if (typeof arg === "function") {
      return arg;
    } else if (typeof arg === "string") {
      return sc(arg);
    }
    return function() { return arg; };
  };
  sc.use = function(type) {
    if (type === "global") {
      Object.keys(sc).forEach(function(key) {
        if (!global[key]) {
          global[key] = sc[key];
        }
      });
    }
    return sc;
  };
  Number.prototype.sc = Array.prototype.sc = String.prototype.sc = Function.prototype.sc =
    function(key) {
      return this[key].bind.apply(this[key], [this].concat(slice.call(arguments, 1)));
    };
  sc.isArrayArgs = function(list, len) {
    for (var i = 0, imax = Math.max(list.length, len|0); i < imax; ++i) {
      if (Array.isArray(list[i])) { return true; }
    }
    return false;
  };
  sc.Range = sc.R = (function() {
    var re = /^\s*(?:([-+]?(?:\d+|\d+\.\d+))\s*,\s*)?([-+]?(?:\d+|\d+\.\d+))(?:\s*\.\.(\.?)\s*([-+]?(?:\d+|\d+\.\d+)))?\s*$/;
    return function() {
      var a = [], m, i, x, first, last, step;
      if (typeof arguments[0] === "string") {
        if ((m = re.exec(arguments[0])) !== null) {
          if (m[4] === void 0) {
            first = 0;
            last  = +m[2];
            step  = (0 < last) ? +1 : -1;
          } else if (m[1] === void 0) {
            first = +m[2];
            last  = +m[4];
            step  = (first < last) ? +1 : -1;
          } else {
            first = +m[1];
            last  = +m[4];
            step  = +m[2] - first;
          }
          i = 0;
          x = first;
          if (m[3]) {
            while (x < last) {
              a[i++] = x;
              x += step;
            }
          } else {
            while (x <= last) {
              a[i++] = x;
              x += step;
            }
          }
        }
      } else if (typeof arguments[0] === "number") {
        first = 0;
        last  = arguments[0];
        step  = (first < last) ? +1 : -1;
        i = 0;
        x = first;
        while (x <= last) {
          a[i++] = x;
          x += step;
        }
      }
      return a;
    };
  })();

  var exports = sc;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = global.sc = exports;
  } else {
    sc.noConflict = (function() {
      var _sc = window.sc;
      return function() {
        if (window.sc === exports) {
          window.sc = _sc;
        }
        return exports;
      };
    })();
    window.sc = exports;
  }

})(global);
