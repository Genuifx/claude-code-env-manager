// ../../node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@0.2.112_zod@4.3.6/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs
import { execFile as $y } from "child_process";
import { randomUUID as GH } from "crypto";
import { copyFile as Xy, mkdir as YH, readFile as Jy, rm as Yy, writeFile as $j } from "fs/promises";
import { createRequire as Qy } from "module";
import { homedir as QH, tmpdir as Wy } from "os";
import { dirname as sD, isAbsolute as Xj, join as i6, relative as zy, resolve as zJ, sep as Jj } from "path";
import { fileURLToPath as Gy } from "url";
import { setMaxListeners as _j } from "events";
import { spawn as j2 } from "child_process";
import { createInterface as F2 } from "readline";
import { homedir as tF } from "os";
import { join as aF } from "path";
import { randomUUID as yM } from "crypto";
import { appendFile as fM, mkdir as gM } from "fs/promises";
import { join as lK } from "path";
import { realpathSync as cK } from "fs";
import { cwd as uM } from "process";
import { randomUUID as YX } from "crypto";
import { appendFile as aK, mkdir as W2, symlink as z2, unlink as G2 } from "fs/promises";
import { dirname as sK, join as GW } from "path";
import * as r from "fs";
import { mkdir as rM, open as oM, readdir as tM, readFile as oK, rename as aM, rmdir as sM, rm as eM, stat as $2, unlink as X2 } from "fs/promises";
import { once as UV } from "events";
import { createWriteStream as x2 } from "fs";
import { execFile as C2 } from "child_process";
import { promisify as k2 } from "util";
import { createHash as vA } from "crypto";
import { userInfo as CA } from "os";
var Aj = Object.create;
var { getPrototypeOf: Ij, defineProperty: M5, getOwnPropertyNames: bj } = Object;
var Zj = Object.prototype.hasOwnProperty;
function Pj($) {
  return this[$];
}
var Rj;
var Ej;
var qH = ($, X, J) => {
  var Q = $ != null && typeof $ === "object";
  if (Q) {
    var Y = X ? Rj ??= /* @__PURE__ */ new WeakMap() : Ej ??= /* @__PURE__ */ new WeakMap(), W = Y.get($);
    if (W) return W;
  }
  J = $ != null ? Aj(Ij($)) : {};
  let z = X || !$ || !$.__esModule ? M5(J, "default", { value: $, enumerable: true }) : J;
  for (let G of bj($)) if (!Zj.call(z, G)) M5(z, G, { get: Pj.bind($, G), enumerable: true });
  if (Q) Y.set($, z);
  return z;
};
var k = ($, X) => () => (X || $((X = { exports: {} }).exports, X), X.exports);
var Sj = ($) => $;
function vj($, X) {
  this[$] = Sj.bind(null, X);
}
var H1 = ($, X) => {
  for (var J in X) M5($, J, { get: X[J], enumerable: true, configurable: true, set: vj.bind(X, J) });
};
var Cj = Symbol.dispose || Symbol.for("Symbol.dispose");
var kj = Symbol.asyncDispose || Symbol.for("Symbol.asyncDispose");
var w$ = ($, X, J) => {
  if (X != null) {
    if (typeof X !== "object" && typeof X !== "function") throw TypeError('Object expected to be assigned to "using" declaration');
    var Q;
    if (J) Q = X[kj];
    if (Q === void 0) Q = X[Cj];
    if (typeof Q !== "function") throw TypeError("Object not disposable");
    $.push([J, Q, X]);
  } else if (J) $.push([J]);
  return X;
};
var B$ = ($, X, J) => {
  var Q = typeof SuppressedError === "function" ? SuppressedError : function(z, G, U, H) {
    return H = Error(U), H.name = "SuppressedError", H.error = z, H.suppressed = G, H;
  }, Y = (z) => X = J ? new Q(z, X, "An error was suppressed during disposal") : (J = true, z), W = (z) => {
    while (z = $.pop()) try {
      var G = z[1] && z[1].call(z[2]);
      if (z[0]) return Promise.resolve(G).then(W, (U) => (Y(U), W()));
    } catch (U) {
      Y(U);
    }
    if (J) throw X;
  };
  return W();
};
var f9 = k((Jw) => {
  Object.defineProperty(Jw, "__esModule", { value: true });
  Jw.regexpCode = Jw.getEsmExportName = Jw.getProperty = Jw.safeStringify = Jw.stringify = Jw.strConcat = Jw.addCodeArg = Jw.str = Jw._ = Jw.nil = Jw._Code = Jw.Name = Jw.IDENTIFIER = Jw._CodeOrName = void 0;
  class xQ {
  }
  Jw._CodeOrName = xQ;
  Jw.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  class r0 extends xQ {
    constructor($) {
      super();
      if (!Jw.IDENTIFIER.test($)) throw Error("CodeGen: name must be a valid identifier");
      this.str = $;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      return false;
    }
    get names() {
      return { [this.str]: 1 };
    }
  }
  Jw.Name = r0;
  class u6 extends xQ {
    constructor($) {
      super();
      this._items = typeof $ === "string" ? [$] : $;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      if (this._items.length > 1) return false;
      let $ = this._items[0];
      return $ === "" || $ === '""';
    }
    get str() {
      var $;
      return ($ = this._str) !== null && $ !== void 0 ? $ : this._str = this._items.reduce((X, J) => `${X}${J}`, "");
    }
    get names() {
      var $;
      return ($ = this._names) !== null && $ !== void 0 ? $ : this._names = this._items.reduce((X, J) => {
        if (J instanceof r0) X[J.str] = (X[J.str] || 0) + 1;
        return X;
      }, {});
    }
  }
  Jw._Code = u6;
  Jw.nil = new u6("");
  function $w($, ...X) {
    let J = [$[0]], Q = 0;
    while (Q < X.length) rG(J, X[Q]), J.push($[++Q]);
    return new u6(J);
  }
  Jw._ = $w;
  var nG = new u6("+");
  function Xw($, ...X) {
    let J = [y9($[0])], Q = 0;
    while (Q < X.length) J.push(nG), rG(J, X[Q]), J.push(nG, y9($[++Q]));
    return xR(J), new u6(J);
  }
  Jw.str = Xw;
  function rG($, X) {
    if (X instanceof u6) $.push(...X._items);
    else if (X instanceof r0) $.push(X);
    else $.push(fR(X));
  }
  Jw.addCodeArg = rG;
  function xR($) {
    let X = 1;
    while (X < $.length - 1) {
      if ($[X] === nG) {
        let J = TR($[X - 1], $[X + 1]);
        if (J !== void 0) {
          $.splice(X - 1, 3, J);
          continue;
        }
        $[X++] = "+";
      }
      X++;
    }
  }
  function TR($, X) {
    if (X === '""') return $;
    if ($ === '""') return X;
    if (typeof $ == "string") {
      if (X instanceof r0 || $[$.length - 1] !== '"') return;
      if (typeof X != "string") return `${$.slice(0, -1)}${X}"`;
      if (X[0] === '"') return $.slice(0, -1) + X.slice(1);
      return;
    }
    if (typeof X == "string" && X[0] === '"' && !($ instanceof r0)) return `"${$}${X.slice(1)}`;
    return;
  }
  function yR($, X) {
    return X.emptyStr() ? $ : $.emptyStr() ? X : Xw`${$}${X}`;
  }
  Jw.strConcat = yR;
  function fR($) {
    return typeof $ == "number" || typeof $ == "boolean" || $ === null ? $ : y9(Array.isArray($) ? $.join(",") : $);
  }
  function gR($) {
    return new u6(y9($));
  }
  Jw.stringify = gR;
  function y9($) {
    return JSON.stringify($).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }
  Jw.safeStringify = y9;
  function hR($) {
    return typeof $ == "string" && Jw.IDENTIFIER.test($) ? new u6(`.${$}`) : $w`[${$}]`;
  }
  Jw.getProperty = hR;
  function uR($) {
    if (typeof $ == "string" && Jw.IDENTIFIER.test($)) return new u6(`${$}`);
    throw Error(`CodeGen: invalid export name: ${$}, use explicit $id name mapping`);
  }
  Jw.getEsmExportName = uR;
  function mR($) {
    return new u6($.toString());
  }
  Jw.regexpCode = mR;
});
var sG = k((zw) => {
  Object.defineProperty(zw, "__esModule", { value: true });
  zw.ValueScope = zw.ValueScopeName = zw.Scope = zw.varKinds = zw.UsedValueState = void 0;
  var H6 = f9();
  class Qw extends Error {
    constructor($) {
      super(`CodeGen: "code" for ${$} not defined`);
      this.value = $.value;
    }
  }
  var yQ;
  (function($) {
    $[$.Started = 0] = "Started", $[$.Completed = 1] = "Completed";
  })(yQ || (zw.UsedValueState = yQ = {}));
  zw.varKinds = { const: new H6.Name("const"), let: new H6.Name("let"), var: new H6.Name("var") };
  class tG {
    constructor({ prefixes: $, parent: X } = {}) {
      this._names = {}, this._prefixes = $, this._parent = X;
    }
    toName($) {
      return $ instanceof H6.Name ? $ : this.name($);
    }
    name($) {
      return new H6.Name(this._newName($));
    }
    _newName($) {
      let X = this._names[$] || this._nameGroup($);
      return `${$}${X.index++}`;
    }
    _nameGroup($) {
      var X, J;
      if (((J = (X = this._parent) === null || X === void 0 ? void 0 : X._prefixes) === null || J === void 0 ? void 0 : J.has($)) || this._prefixes && !this._prefixes.has($)) throw Error(`CodeGen: prefix "${$}" is not allowed in this scope`);
      return this._names[$] = { prefix: $, index: 0 };
    }
  }
  zw.Scope = tG;
  class aG extends H6.Name {
    constructor($, X) {
      super(X);
      this.prefix = $;
    }
    setValue($, { property: X, itemIndex: J }) {
      this.value = $, this.scopePath = H6._`.${new H6.Name(X)}[${J}]`;
    }
  }
  zw.ValueScopeName = aG;
  var $E = H6._`\n`;
  class Ww extends tG {
    constructor($) {
      super($);
      this._values = {}, this._scope = $.scope, this.opts = { ...$, _n: $.lines ? $E : H6.nil };
    }
    get() {
      return this._scope;
    }
    name($) {
      return new aG($, this._newName($));
    }
    value($, X) {
      var J;
      if (X.ref === void 0) throw Error("CodeGen: ref must be passed in value");
      let Q = this.toName($), { prefix: Y } = Q, W = (J = X.key) !== null && J !== void 0 ? J : X.ref, z = this._values[Y];
      if (z) {
        let H = z.get(W);
        if (H) return H;
      } else z = this._values[Y] = /* @__PURE__ */ new Map();
      z.set(W, Q);
      let G = this._scope[Y] || (this._scope[Y] = []), U = G.length;
      return G[U] = X.ref, Q.setValue(X, { property: Y, itemIndex: U }), Q;
    }
    getValue($, X) {
      let J = this._values[$];
      if (!J) return;
      return J.get(X);
    }
    scopeRefs($, X = this._values) {
      return this._reduceValues(X, (J) => {
        if (J.scopePath === void 0) throw Error(`CodeGen: name "${J}" has no value`);
        return H6._`${$}${J.scopePath}`;
      });
    }
    scopeCode($ = this._values, X, J) {
      return this._reduceValues($, (Q) => {
        if (Q.value === void 0) throw Error(`CodeGen: name "${Q}" has no value`);
        return Q.value.code;
      }, X, J);
    }
    _reduceValues($, X, J = {}, Q) {
      let Y = H6.nil;
      for (let W in $) {
        let z = $[W];
        if (!z) continue;
        let G = J[W] = J[W] || /* @__PURE__ */ new Map();
        z.forEach((U) => {
          if (G.has(U)) return;
          G.set(U, yQ.Started);
          let H = X(U);
          if (H) {
            let K = this.opts.es5 ? zw.varKinds.var : zw.varKinds.const;
            Y = H6._`${Y}${K} ${U} = ${H};${this.opts._n}`;
          } else if (H = Q === null || Q === void 0 ? void 0 : Q(U)) Y = H6._`${Y}${H}${this.opts._n}`;
          else throw new Qw(U);
          G.set(U, yQ.Completed);
        });
      }
      return Y;
    }
  }
  zw.ValueScope = Ww;
});
var a = k((K6) => {
  Object.defineProperty(K6, "__esModule", { value: true });
  K6.or = K6.and = K6.not = K6.CodeGen = K6.operators = K6.varKinds = K6.ValueScopeName = K6.ValueScope = K6.Scope = K6.Name = K6.regexpCode = K6.stringify = K6.getProperty = K6.nil = K6.strConcat = K6.str = K6._ = void 0;
  var Y$ = f9(), m6 = sG(), e4 = f9();
  Object.defineProperty(K6, "_", { enumerable: true, get: function() {
    return e4._;
  } });
  Object.defineProperty(K6, "str", { enumerable: true, get: function() {
    return e4.str;
  } });
  Object.defineProperty(K6, "strConcat", { enumerable: true, get: function() {
    return e4.strConcat;
  } });
  Object.defineProperty(K6, "nil", { enumerable: true, get: function() {
    return e4.nil;
  } });
  Object.defineProperty(K6, "getProperty", { enumerable: true, get: function() {
    return e4.getProperty;
  } });
  Object.defineProperty(K6, "stringify", { enumerable: true, get: function() {
    return e4.stringify;
  } });
  Object.defineProperty(K6, "regexpCode", { enumerable: true, get: function() {
    return e4.regexpCode;
  } });
  Object.defineProperty(K6, "Name", { enumerable: true, get: function() {
    return e4.Name;
  } });
  var lQ = sG();
  Object.defineProperty(K6, "Scope", { enumerable: true, get: function() {
    return lQ.Scope;
  } });
  Object.defineProperty(K6, "ValueScope", { enumerable: true, get: function() {
    return lQ.ValueScope;
  } });
  Object.defineProperty(K6, "ValueScopeName", { enumerable: true, get: function() {
    return lQ.ValueScopeName;
  } });
  Object.defineProperty(K6, "varKinds", { enumerable: true, get: function() {
    return lQ.varKinds;
  } });
  K6.operators = { GT: new Y$._Code(">"), GTE: new Y$._Code(">="), LT: new Y$._Code("<"), LTE: new Y$._Code("<="), EQ: new Y$._Code("==="), NEQ: new Y$._Code("!=="), NOT: new Y$._Code("!"), OR: new Y$._Code("||"), AND: new Y$._Code("&&"), ADD: new Y$._Code("+") };
  class $1 {
    optimizeNodes() {
      return this;
    }
    optimizeNames($, X) {
      return this;
    }
  }
  class Uw extends $1 {
    constructor($, X, J) {
      super();
      this.varKind = $, this.name = X, this.rhs = J;
    }
    render({ es5: $, _n: X }) {
      let J = $ ? m6.varKinds.var : this.varKind, Q = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
      return `${J} ${this.name}${Q};` + X;
    }
    optimizeNames($, X) {
      if (!$[this.name.str]) return;
      if (this.rhs) this.rhs = t0(this.rhs, $, X);
      return this;
    }
    get names() {
      return this.rhs instanceof Y$._CodeOrName ? this.rhs.names : {};
    }
  }
  class XU extends $1 {
    constructor($, X, J) {
      super();
      this.lhs = $, this.rhs = X, this.sideEffects = J;
    }
    render({ _n: $ }) {
      return `${this.lhs} = ${this.rhs};` + $;
    }
    optimizeNames($, X) {
      if (this.lhs instanceof Y$.Name && !$[this.lhs.str] && !this.sideEffects) return;
      return this.rhs = t0(this.rhs, $, X), this;
    }
    get names() {
      let $ = this.lhs instanceof Y$.Name ? {} : { ...this.lhs.names };
      return mQ($, this.rhs);
    }
  }
  class Hw extends XU {
    constructor($, X, J, Q) {
      super($, J, Q);
      this.op = X;
    }
    render({ _n: $ }) {
      return `${this.lhs} ${this.op}= ${this.rhs};` + $;
    }
  }
  class Kw extends $1 {
    constructor($) {
      super();
      this.label = $, this.names = {};
    }
    render({ _n: $ }) {
      return `${this.label}:` + $;
    }
  }
  class Vw extends $1 {
    constructor($) {
      super();
      this.label = $, this.names = {};
    }
    render({ _n: $ }) {
      return `break${this.label ? ` ${this.label}` : ""};` + $;
    }
  }
  class Nw extends $1 {
    constructor($) {
      super();
      this.error = $;
    }
    render({ _n: $ }) {
      return `throw ${this.error};` + $;
    }
    get names() {
      return this.error.names;
    }
  }
  class Ow extends $1 {
    constructor($) {
      super();
      this.code = $;
    }
    render({ _n: $ }) {
      return `${this.code};` + $;
    }
    optimizeNodes() {
      return `${this.code}` ? this : void 0;
    }
    optimizeNames($, X) {
      return this.code = t0(this.code, $, X), this;
    }
    get names() {
      return this.code instanceof Y$._CodeOrName ? this.code.names : {};
    }
  }
  class cQ extends $1 {
    constructor($ = []) {
      super();
      this.nodes = $;
    }
    render($) {
      return this.nodes.reduce((X, J) => X + J.render($), "");
    }
    optimizeNodes() {
      let { nodes: $ } = this, X = $.length;
      while (X--) {
        let J = $[X].optimizeNodes();
        if (Array.isArray(J)) $.splice(X, 1, ...J);
        else if (J) $[X] = J;
        else $.splice(X, 1);
      }
      return $.length > 0 ? this : void 0;
    }
    optimizeNames($, X) {
      let { nodes: J } = this, Q = J.length;
      while (Q--) {
        let Y = J[Q];
        if (Y.optimizeNames($, X)) continue;
        QE($, Y.names), J.splice(Q, 1);
      }
      return J.length > 0 ? this : void 0;
    }
    get names() {
      return this.nodes.reduce(($, X) => y1($, X.names), {});
    }
  }
  class X1 extends cQ {
    render($) {
      return "{" + $._n + super.render($) + "}" + $._n;
    }
  }
  class ww extends cQ {
  }
  class g9 extends X1 {
  }
  g9.kind = "else";
  class I4 extends X1 {
    constructor($, X) {
      super(X);
      this.condition = $;
    }
    render($) {
      let X = `if(${this.condition})` + super.render($);
      if (this.else) X += "else " + this.else.render($);
      return X;
    }
    optimizeNodes() {
      super.optimizeNodes();
      let $ = this.condition;
      if ($ === true) return this.nodes;
      let X = this.else;
      if (X) {
        let J = X.optimizeNodes();
        X = this.else = Array.isArray(J) ? new g9(J) : J;
      }
      if (X) {
        if ($ === false) return X instanceof I4 ? X : X.nodes;
        if (this.nodes.length) return this;
        return new I4(jw($), X instanceof I4 ? [X] : X.nodes);
      }
      if ($ === false || !this.nodes.length) return;
      return this;
    }
    optimizeNames($, X) {
      var J;
      if (this.else = (J = this.else) === null || J === void 0 ? void 0 : J.optimizeNames($, X), !(super.optimizeNames($, X) || this.else)) return;
      return this.condition = t0(this.condition, $, X), this;
    }
    get names() {
      let $ = super.names;
      if (mQ($, this.condition), this.else) y1($, this.else.names);
      return $;
    }
  }
  I4.kind = "if";
  class o0 extends X1 {
  }
  o0.kind = "for";
  class Bw extends o0 {
    constructor($) {
      super();
      this.iteration = $;
    }
    render($) {
      return `for(${this.iteration})` + super.render($);
    }
    optimizeNames($, X) {
      if (!super.optimizeNames($, X)) return;
      return this.iteration = t0(this.iteration, $, X), this;
    }
    get names() {
      return y1(super.names, this.iteration.names);
    }
  }
  class qw extends o0 {
    constructor($, X, J, Q) {
      super();
      this.varKind = $, this.name = X, this.from = J, this.to = Q;
    }
    render($) {
      let X = $.es5 ? m6.varKinds.var : this.varKind, { name: J, from: Q, to: Y } = this;
      return `for(${X} ${J}=${Q}; ${J}<${Y}; ${J}++)` + super.render($);
    }
    get names() {
      let $ = mQ(super.names, this.from);
      return mQ($, this.to);
    }
  }
  class eG extends o0 {
    constructor($, X, J, Q) {
      super();
      this.loop = $, this.varKind = X, this.name = J, this.iterable = Q;
    }
    render($) {
      return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render($);
    }
    optimizeNames($, X) {
      if (!super.optimizeNames($, X)) return;
      return this.iterable = t0(this.iterable, $, X), this;
    }
    get names() {
      return y1(super.names, this.iterable.names);
    }
  }
  class fQ extends X1 {
    constructor($, X, J) {
      super();
      this.name = $, this.args = X, this.async = J;
    }
    render($) {
      return `${this.async ? "async " : ""}function ${this.name}(${this.args})` + super.render($);
    }
  }
  fQ.kind = "func";
  class gQ extends cQ {
    render($) {
      return "return " + super.render($);
    }
  }
  gQ.kind = "return";
  class Lw extends X1 {
    render($) {
      let X = "try" + super.render($);
      if (this.catch) X += this.catch.render($);
      if (this.finally) X += this.finally.render($);
      return X;
    }
    optimizeNodes() {
      var $, X;
      return super.optimizeNodes(), ($ = this.catch) === null || $ === void 0 || $.optimizeNodes(), (X = this.finally) === null || X === void 0 || X.optimizeNodes(), this;
    }
    optimizeNames($, X) {
      var J, Q;
      return super.optimizeNames($, X), (J = this.catch) === null || J === void 0 || J.optimizeNames($, X), (Q = this.finally) === null || Q === void 0 || Q.optimizeNames($, X), this;
    }
    get names() {
      let $ = super.names;
      if (this.catch) y1($, this.catch.names);
      if (this.finally) y1($, this.finally.names);
      return $;
    }
  }
  class hQ extends X1 {
    constructor($) {
      super();
      this.error = $;
    }
    render($) {
      return `catch(${this.error})` + super.render($);
    }
  }
  hQ.kind = "catch";
  class uQ extends X1 {
    render($) {
      return "finally" + super.render($);
    }
  }
  uQ.kind = "finally";
  class Dw {
    constructor($, X = {}) {
      this._values = {}, this._blockStarts = [], this._constants = {}, this.opts = { ...X, _n: X.lines ? `
` : "" }, this._extScope = $, this._scope = new m6.Scope({ parent: $ }), this._nodes = [new ww()];
    }
    toString() {
      return this._root.render(this.opts);
    }
    name($) {
      return this._scope.name($);
    }
    scopeName($) {
      return this._extScope.name($);
    }
    scopeValue($, X) {
      let J = this._extScope.value($, X);
      return (this._values[J.prefix] || (this._values[J.prefix] = /* @__PURE__ */ new Set())).add(J), J;
    }
    getScopeValue($, X) {
      return this._extScope.getValue($, X);
    }
    scopeRefs($) {
      return this._extScope.scopeRefs($, this._values);
    }
    scopeCode() {
      return this._extScope.scopeCode(this._values);
    }
    _def($, X, J, Q) {
      let Y = this._scope.toName(X);
      if (J !== void 0 && Q) this._constants[Y.str] = J;
      return this._leafNode(new Uw($, Y, J)), Y;
    }
    const($, X, J) {
      return this._def(m6.varKinds.const, $, X, J);
    }
    let($, X, J) {
      return this._def(m6.varKinds.let, $, X, J);
    }
    var($, X, J) {
      return this._def(m6.varKinds.var, $, X, J);
    }
    assign($, X, J) {
      return this._leafNode(new XU($, X, J));
    }
    add($, X) {
      return this._leafNode(new Hw($, K6.operators.ADD, X));
    }
    code($) {
      if (typeof $ == "function") $();
      else if ($ !== Y$.nil) this._leafNode(new Ow($));
      return this;
    }
    object(...$) {
      let X = ["{"];
      for (let [J, Q] of $) {
        if (X.length > 1) X.push(",");
        if (X.push(J), J !== Q || this.opts.es5) X.push(":"), (0, Y$.addCodeArg)(X, Q);
      }
      return X.push("}"), new Y$._Code(X);
    }
    if($, X, J) {
      if (this._blockNode(new I4($)), X && J) this.code(X).else().code(J).endIf();
      else if (X) this.code(X).endIf();
      else if (J) throw Error('CodeGen: "else" body without "then" body');
      return this;
    }
    elseIf($) {
      return this._elseNode(new I4($));
    }
    else() {
      return this._elseNode(new g9());
    }
    endIf() {
      return this._endBlockNode(I4, g9);
    }
    _for($, X) {
      if (this._blockNode($), X) this.code(X).endFor();
      return this;
    }
    for($, X) {
      return this._for(new Bw($), X);
    }
    forRange($, X, J, Q, Y = this.opts.es5 ? m6.varKinds.var : m6.varKinds.let) {
      let W = this._scope.toName($);
      return this._for(new qw(Y, W, X, J), () => Q(W));
    }
    forOf($, X, J, Q = m6.varKinds.const) {
      let Y = this._scope.toName($);
      if (this.opts.es5) {
        let W = X instanceof Y$.Name ? X : this.var("_arr", X);
        return this.forRange("_i", 0, Y$._`${W}.length`, (z) => {
          this.var(Y, Y$._`${W}[${z}]`), J(Y);
        });
      }
      return this._for(new eG("of", Q, Y, X), () => J(Y));
    }
    forIn($, X, J, Q = this.opts.es5 ? m6.varKinds.var : m6.varKinds.const) {
      if (this.opts.ownProperties) return this.forOf($, Y$._`Object.keys(${X})`, J);
      let Y = this._scope.toName($);
      return this._for(new eG("in", Q, Y, X), () => J(Y));
    }
    endFor() {
      return this._endBlockNode(o0);
    }
    label($) {
      return this._leafNode(new Kw($));
    }
    break($) {
      return this._leafNode(new Vw($));
    }
    return($) {
      let X = new gQ();
      if (this._blockNode(X), this.code($), X.nodes.length !== 1) throw Error('CodeGen: "return" should have one node');
      return this._endBlockNode(gQ);
    }
    try($, X, J) {
      if (!X && !J) throw Error('CodeGen: "try" without "catch" and "finally"');
      let Q = new Lw();
      if (this._blockNode(Q), this.code($), X) {
        let Y = this.name("e");
        this._currNode = Q.catch = new hQ(Y), X(Y);
      }
      if (J) this._currNode = Q.finally = new uQ(), this.code(J);
      return this._endBlockNode(hQ, uQ);
    }
    throw($) {
      return this._leafNode(new Nw($));
    }
    block($, X) {
      if (this._blockStarts.push(this._nodes.length), $) this.code($).endBlock(X);
      return this;
    }
    endBlock($) {
      let X = this._blockStarts.pop();
      if (X === void 0) throw Error("CodeGen: not in self-balancing block");
      let J = this._nodes.length - X;
      if (J < 0 || $ !== void 0 && J !== $) throw Error(`CodeGen: wrong number of nodes: ${J} vs ${$} expected`);
      return this._nodes.length = X, this;
    }
    func($, X = Y$.nil, J, Q) {
      if (this._blockNode(new fQ($, X, J)), Q) this.code(Q).endFunc();
      return this;
    }
    endFunc() {
      return this._endBlockNode(fQ);
    }
    optimize($ = 1) {
      while ($-- > 0) this._root.optimizeNodes(), this._root.optimizeNames(this._root.names, this._constants);
    }
    _leafNode($) {
      return this._currNode.nodes.push($), this;
    }
    _blockNode($) {
      this._currNode.nodes.push($), this._nodes.push($);
    }
    _endBlockNode($, X) {
      let J = this._currNode;
      if (J instanceof $ || X && J instanceof X) return this._nodes.pop(), this;
      throw Error(`CodeGen: not in block "${X ? `${$.kind}/${X.kind}` : $.kind}"`);
    }
    _elseNode($) {
      let X = this._currNode;
      if (!(X instanceof I4)) throw Error('CodeGen: "else" without "if"');
      return this._currNode = X.else = $, this;
    }
    get _root() {
      return this._nodes[0];
    }
    get _currNode() {
      let $ = this._nodes;
      return $[$.length - 1];
    }
    set _currNode($) {
      let X = this._nodes;
      X[X.length - 1] = $;
    }
  }
  K6.CodeGen = Dw;
  function y1($, X) {
    for (let J in X) $[J] = ($[J] || 0) + (X[J] || 0);
    return $;
  }
  function mQ($, X) {
    return X instanceof Y$._CodeOrName ? y1($, X.names) : $;
  }
  function t0($, X, J) {
    if ($ instanceof Y$.Name) return Q($);
    if (!Y($)) return $;
    return new Y$._Code($._items.reduce((W, z) => {
      if (z instanceof Y$.Name) z = Q(z);
      if (z instanceof Y$._Code) W.push(...z._items);
      else W.push(z);
      return W;
    }, []));
    function Q(W) {
      let z = J[W.str];
      if (z === void 0 || X[W.str] !== 1) return W;
      return delete X[W.str], z;
    }
    function Y(W) {
      return W instanceof Y$._Code && W._items.some((z) => z instanceof Y$.Name && X[z.str] === 1 && J[z.str] !== void 0);
    }
  }
  function QE($, X) {
    for (let J in X) $[J] = ($[J] || 0) - (X[J] || 0);
  }
  function jw($) {
    return typeof $ == "boolean" || typeof $ == "number" || $ === null ? !$ : Y$._`!${$U($)}`;
  }
  K6.not = jw;
  var WE = Fw(K6.operators.AND);
  function zE(...$) {
    return $.reduce(WE);
  }
  K6.and = zE;
  var GE = Fw(K6.operators.OR);
  function UE(...$) {
    return $.reduce(GE);
  }
  K6.or = UE;
  function Fw($) {
    return (X, J) => X === Y$.nil ? J : J === Y$.nil ? X : Y$._`${$U(X)} ${$} ${$U(J)}`;
  }
  function $U($) {
    return $ instanceof Y$.Name ? $ : Y$._`(${$})`;
  }
});
var Q$ = k((Sw) => {
  Object.defineProperty(Sw, "__esModule", { value: true });
  Sw.checkStrictMode = Sw.getErrorPath = Sw.Type = Sw.useFunc = Sw.setEvaluated = Sw.evaluatedPropsToName = Sw.mergeEvaluated = Sw.eachItem = Sw.unescapeJsonPointer = Sw.escapeJsonPointer = Sw.escapeFragment = Sw.unescapeFragment = Sw.schemaRefOrVal = Sw.schemaHasRulesButRef = Sw.schemaHasRules = Sw.checkUnknownRules = Sw.alwaysValidSchema = Sw.toHash = void 0;
  var O$ = a(), NE = f9();
  function OE($) {
    let X = {};
    for (let J of $) X[J] = true;
    return X;
  }
  Sw.toHash = OE;
  function wE($, X) {
    if (typeof X == "boolean") return X;
    if (Object.keys(X).length === 0) return true;
    return bw($, X), !Zw(X, $.self.RULES.all);
  }
  Sw.alwaysValidSchema = wE;
  function bw($, X = $.schema) {
    let { opts: J, self: Q } = $;
    if (!J.strictSchema) return;
    if (typeof X === "boolean") return;
    let Y = Q.RULES.keywords;
    for (let W in X) if (!Y[W]) Ew($, `unknown keyword: "${W}"`);
  }
  Sw.checkUnknownRules = bw;
  function Zw($, X) {
    if (typeof $ == "boolean") return !$;
    for (let J in $) if (X[J]) return true;
    return false;
  }
  Sw.schemaHasRules = Zw;
  function BE($, X) {
    if (typeof $ == "boolean") return !$;
    for (let J in $) if (J !== "$ref" && X.all[J]) return true;
    return false;
  }
  Sw.schemaHasRulesButRef = BE;
  function qE({ topSchemaRef: $, schemaPath: X }, J, Q, Y) {
    if (!Y) {
      if (typeof J == "number" || typeof J == "boolean") return J;
      if (typeof J == "string") return O$._`${J}`;
    }
    return O$._`${$}${X}${(0, O$.getProperty)(Q)}`;
  }
  Sw.schemaRefOrVal = qE;
  function LE($) {
    return Pw(decodeURIComponent($));
  }
  Sw.unescapeFragment = LE;
  function DE($) {
    return encodeURIComponent(YU($));
  }
  Sw.escapeFragment = DE;
  function YU($) {
    if (typeof $ == "number") return `${$}`;
    return $.replace(/~/g, "~0").replace(/\//g, "~1");
  }
  Sw.escapeJsonPointer = YU;
  function Pw($) {
    return $.replace(/~1/g, "/").replace(/~0/g, "~");
  }
  Sw.unescapeJsonPointer = Pw;
  function jE($, X) {
    if (Array.isArray($)) for (let J of $) X(J);
    else X($);
  }
  Sw.eachItem = jE;
  function Aw({ mergeNames: $, mergeToName: X, mergeValues: J, resultToName: Q }) {
    return (Y, W, z, G) => {
      let U = z === void 0 ? W : z instanceof O$.Name ? (W instanceof O$.Name ? $(Y, W, z) : X(Y, W, z), z) : W instanceof O$.Name ? (X(Y, z, W), W) : J(W, z);
      return G === O$.Name && !(U instanceof O$.Name) ? Q(Y, U) : U;
    };
  }
  Sw.mergeEvaluated = { props: Aw({ mergeNames: ($, X, J) => $.if(O$._`${J} !== true && ${X} !== undefined`, () => {
    $.if(O$._`${X} === true`, () => $.assign(J, true), () => $.assign(J, O$._`${J} || {}`).code(O$._`Object.assign(${J}, ${X})`));
  }), mergeToName: ($, X, J) => $.if(O$._`${J} !== true`, () => {
    if (X === true) $.assign(J, true);
    else $.assign(J, O$._`${J} || {}`), QU($, J, X);
  }), mergeValues: ($, X) => $ === true ? true : { ...$, ...X }, resultToName: Rw }), items: Aw({ mergeNames: ($, X, J) => $.if(O$._`${J} !== true && ${X} !== undefined`, () => $.assign(J, O$._`${X} === true ? true : ${J} > ${X} ? ${J} : ${X}`)), mergeToName: ($, X, J) => $.if(O$._`${J} !== true`, () => $.assign(J, X === true ? true : O$._`${J} > ${X} ? ${J} : ${X}`)), mergeValues: ($, X) => $ === true ? true : Math.max($, X), resultToName: ($, X) => $.var("items", X) }) };
  function Rw($, X) {
    if (X === true) return $.var("props", true);
    let J = $.var("props", O$._`{}`);
    if (X !== void 0) QU($, J, X);
    return J;
  }
  Sw.evaluatedPropsToName = Rw;
  function QU($, X, J) {
    Object.keys(J).forEach((Q) => $.assign(O$._`${X}${(0, O$.getProperty)(Q)}`, true));
  }
  Sw.setEvaluated = QU;
  var Iw = {};
  function FE($, X) {
    return $.scopeValue("func", { ref: X, code: Iw[X.code] || (Iw[X.code] = new NE._Code(X.code)) });
  }
  Sw.useFunc = FE;
  var JU;
  (function($) {
    $[$.Num = 0] = "Num", $[$.Str = 1] = "Str";
  })(JU || (Sw.Type = JU = {}));
  function ME($, X, J) {
    if ($ instanceof O$.Name) {
      let Q = X === JU.Num;
      return J ? Q ? O$._`"[" + ${$} + "]"` : O$._`"['" + ${$} + "']"` : Q ? O$._`"/" + ${$}` : O$._`"/" + ${$}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
    }
    return J ? (0, O$.getProperty)($).toString() : "/" + YU($);
  }
  Sw.getErrorPath = ME;
  function Ew($, X, J = $.opts.strictSchema) {
    if (!J) return;
    if (X = `strict mode: ${X}`, J === true) throw Error(X);
    $.self.logger.warn(X);
  }
  Sw.checkStrictMode = Ew;
});
var b4 = k((Cw) => {
  Object.defineProperty(Cw, "__esModule", { value: true });
  var i$ = a(), hE = { data: new i$.Name("data"), valCxt: new i$.Name("valCxt"), instancePath: new i$.Name("instancePath"), parentData: new i$.Name("parentData"), parentDataProperty: new i$.Name("parentDataProperty"), rootData: new i$.Name("rootData"), dynamicAnchors: new i$.Name("dynamicAnchors"), vErrors: new i$.Name("vErrors"), errors: new i$.Name("errors"), this: new i$.Name("this"), self: new i$.Name("self"), scope: new i$.Name("scope"), json: new i$.Name("json"), jsonPos: new i$.Name("jsonPos"), jsonLen: new i$.Name("jsonLen"), jsonPart: new i$.Name("jsonPart") };
  Cw.default = hE;
});
var h9 = k((Tw) => {
  Object.defineProperty(Tw, "__esModule", { value: true });
  Tw.extendErrors = Tw.resetErrorsCount = Tw.reportExtraError = Tw.reportError = Tw.keyword$DataError = Tw.keywordError = void 0;
  var W$ = a(), dQ = Q$(), e$ = b4();
  Tw.keywordError = { message: ({ keyword: $ }) => W$.str`must pass "${$}" keyword validation` };
  Tw.keyword$DataError = { message: ({ keyword: $, schemaType: X }) => X ? W$.str`"${$}" keyword must be ${X} ($data)` : W$.str`"${$}" keyword is invalid ($data)` };
  function mE($, X = Tw.keywordError, J, Q) {
    let { it: Y } = $, { gen: W, compositeRule: z, allErrors: G } = Y, U = xw($, X, J);
    if (Q !== null && Q !== void 0 ? Q : z || G) kw(W, U);
    else _w(Y, W$._`[${U}]`);
  }
  Tw.reportError = mE;
  function lE($, X = Tw.keywordError, J) {
    let { it: Q } = $, { gen: Y, compositeRule: W, allErrors: z } = Q, G = xw($, X, J);
    if (kw(Y, G), !(W || z)) _w(Q, e$.default.vErrors);
  }
  Tw.reportExtraError = lE;
  function cE($, X) {
    $.assign(e$.default.errors, X), $.if(W$._`${e$.default.vErrors} !== null`, () => $.if(X, () => $.assign(W$._`${e$.default.vErrors}.length`, X), () => $.assign(e$.default.vErrors, null)));
  }
  Tw.resetErrorsCount = cE;
  function pE({ gen: $, keyword: X, schemaValue: J, data: Q, errsCount: Y, it: W }) {
    if (Y === void 0) throw Error("ajv implementation error");
    let z = $.name("err");
    $.forRange("i", Y, e$.default.errors, (G) => {
      if ($.const(z, W$._`${e$.default.vErrors}[${G}]`), $.if(W$._`${z}.instancePath === undefined`, () => $.assign(W$._`${z}.instancePath`, (0, W$.strConcat)(e$.default.instancePath, W.errorPath))), $.assign(W$._`${z}.schemaPath`, W$.str`${W.errSchemaPath}/${X}`), W.opts.verbose) $.assign(W$._`${z}.schema`, J), $.assign(W$._`${z}.data`, Q);
    });
  }
  Tw.extendErrors = pE;
  function kw($, X) {
    let J = $.const("err", X);
    $.if(W$._`${e$.default.vErrors} === null`, () => $.assign(e$.default.vErrors, W$._`[${J}]`), W$._`${e$.default.vErrors}.push(${J})`), $.code(W$._`${e$.default.errors}++`);
  }
  function _w($, X) {
    let { gen: J, validateName: Q, schemaEnv: Y } = $;
    if (Y.$async) J.throw(W$._`new ${$.ValidationError}(${X})`);
    else J.assign(W$._`${Q}.errors`, X), J.return(false);
  }
  var f1 = { keyword: new W$.Name("keyword"), schemaPath: new W$.Name("schemaPath"), params: new W$.Name("params"), propertyName: new W$.Name("propertyName"), message: new W$.Name("message"), schema: new W$.Name("schema"), parentSchema: new W$.Name("parentSchema") };
  function xw($, X, J) {
    let { createErrors: Q } = $.it;
    if (Q === false) return W$._`{}`;
    return dE($, X, J);
  }
  function dE($, X, J = {}) {
    let { gen: Q, it: Y } = $, W = [iE(Y, J), nE($, J)];
    return rE($, X, W), Q.object(...W);
  }
  function iE({ errorPath: $ }, { instancePath: X }) {
    let J = X ? W$.str`${$}${(0, dQ.getErrorPath)(X, dQ.Type.Str)}` : $;
    return [e$.default.instancePath, (0, W$.strConcat)(e$.default.instancePath, J)];
  }
  function nE({ keyword: $, it: { errSchemaPath: X } }, { schemaPath: J, parentSchema: Q }) {
    let Y = Q ? X : W$.str`${X}/${$}`;
    if (J) Y = W$.str`${Y}${(0, dQ.getErrorPath)(J, dQ.Type.Str)}`;
    return [f1.schemaPath, Y];
  }
  function rE($, { params: X, message: J }, Q) {
    let { keyword: Y, data: W, schemaValue: z, it: G } = $, { opts: U, propertyName: H, topSchemaRef: K, schemaPath: V } = G;
    if (Q.push([f1.keyword, Y], [f1.params, typeof X == "function" ? X($) : X || W$._`{}`]), U.messages) Q.push([f1.message, typeof J == "function" ? J($) : J]);
    if (U.verbose) Q.push([f1.schema, z], [f1.parentSchema, W$._`${K}${V}`], [e$.default.data, W]);
    if (H) Q.push([f1.propertyName, H]);
  }
});
var uw = k((gw) => {
  Object.defineProperty(gw, "__esModule", { value: true });
  gw.boolOrEmptySchema = gw.topBoolOrEmptySchema = void 0;
  var eE = h9(), $S = a(), XS = b4(), JS = { message: "boolean schema is false" };
  function YS($) {
    let { gen: X, schema: J, validateName: Q } = $;
    if (J === false) fw($, false);
    else if (typeof J == "object" && J.$async === true) X.return(XS.default.data);
    else X.assign($S._`${Q}.errors`, null), X.return(true);
  }
  gw.topBoolOrEmptySchema = YS;
  function QS($, X) {
    let { gen: J, schema: Q } = $;
    if (Q === false) J.var(X, false), fw($);
    else J.var(X, true);
  }
  gw.boolOrEmptySchema = QS;
  function fw($, X) {
    let { gen: J, data: Q } = $, Y = { gen: J, keyword: "false schema", data: Q, schema: false, schemaCode: false, schemaValue: false, params: {}, it: $ };
    (0, eE.reportError)(Y, JS, void 0, X);
  }
});
var zU = k((mw) => {
  Object.defineProperty(mw, "__esModule", { value: true });
  mw.getRules = mw.isJSONType = void 0;
  var zS = ["string", "number", "integer", "boolean", "null", "object", "array"], GS = new Set(zS);
  function US($) {
    return typeof $ == "string" && GS.has($);
  }
  mw.isJSONType = US;
  function HS() {
    let $ = { number: { type: "number", rules: [] }, string: { type: "string", rules: [] }, array: { type: "array", rules: [] }, object: { type: "object", rules: [] } };
    return { types: { ...$, integer: true, boolean: true, null: true }, rules: [{ rules: [] }, $.number, $.string, $.array, $.object], post: { rules: [] }, all: {}, keywords: {} };
  }
  mw.getRules = HS;
});
var GU = k((dw) => {
  Object.defineProperty(dw, "__esModule", { value: true });
  dw.shouldUseRule = dw.shouldUseGroup = dw.schemaHasRulesForType = void 0;
  function VS({ schema: $, self: X }, J) {
    let Q = X.RULES.types[J];
    return Q && Q !== true && cw($, Q);
  }
  dw.schemaHasRulesForType = VS;
  function cw($, X) {
    return X.rules.some((J) => pw($, J));
  }
  dw.shouldUseGroup = cw;
  function pw($, X) {
    var J;
    return $[X.keyword] !== void 0 || ((J = X.definition.implements) === null || J === void 0 ? void 0 : J.some((Q) => $[Q] !== void 0));
  }
  dw.shouldUseRule = pw;
});
var u9 = k((tw) => {
  Object.defineProperty(tw, "__esModule", { value: true });
  tw.reportTypeError = tw.checkDataTypes = tw.checkDataType = tw.coerceAndCheckDataType = tw.getJSONTypes = tw.getSchemaTypes = tw.DataType = void 0;
  var wS = zU(), BS = GU(), qS = h9(), t = a(), nw = Q$(), a0;
  (function($) {
    $[$.Correct = 0] = "Correct", $[$.Wrong = 1] = "Wrong";
  })(a0 || (tw.DataType = a0 = {}));
  function LS($) {
    let X = rw($.type);
    if (X.includes("null")) {
      if ($.nullable === false) throw Error("type: null contradicts nullable: false");
    } else {
      if (!X.length && $.nullable !== void 0) throw Error('"nullable" cannot be used without "type"');
      if ($.nullable === true) X.push("null");
    }
    return X;
  }
  tw.getSchemaTypes = LS;
  function rw($) {
    let X = Array.isArray($) ? $ : $ ? [$] : [];
    if (X.every(wS.isJSONType)) return X;
    throw Error("type must be JSONType or JSONType[]: " + X.join(","));
  }
  tw.getJSONTypes = rw;
  function DS($, X) {
    let { gen: J, data: Q, opts: Y } = $, W = jS(X, Y.coerceTypes), z = X.length > 0 && !(W.length === 0 && X.length === 1 && (0, BS.schemaHasRulesForType)($, X[0]));
    if (z) {
      let G = HU(X, Q, Y.strictNumbers, a0.Wrong);
      J.if(G, () => {
        if (W.length) FS($, X, W);
        else KU($);
      });
    }
    return z;
  }
  tw.coerceAndCheckDataType = DS;
  var ow = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
  function jS($, X) {
    return X ? $.filter((J) => ow.has(J) || X === "array" && J === "array") : [];
  }
  function FS($, X, J) {
    let { gen: Q, data: Y, opts: W } = $, z = Q.let("dataType", t._`typeof ${Y}`), G = Q.let("coerced", t._`undefined`);
    if (W.coerceTypes === "array") Q.if(t._`${z} == 'object' && Array.isArray(${Y}) && ${Y}.length == 1`, () => Q.assign(Y, t._`${Y}[0]`).assign(z, t._`typeof ${Y}`).if(HU(X, Y, W.strictNumbers), () => Q.assign(G, Y)));
    Q.if(t._`${G} !== undefined`);
    for (let H of J) if (ow.has(H) || H === "array" && W.coerceTypes === "array") U(H);
    Q.else(), KU($), Q.endIf(), Q.if(t._`${G} !== undefined`, () => {
      Q.assign(Y, G), MS($, G);
    });
    function U(H) {
      switch (H) {
        case "string":
          Q.elseIf(t._`${z} == "number" || ${z} == "boolean"`).assign(G, t._`"" + ${Y}`).elseIf(t._`${Y} === null`).assign(G, t._`""`);
          return;
        case "number":
          Q.elseIf(t._`${z} == "boolean" || ${Y} === null
              || (${z} == "string" && ${Y} && ${Y} == +${Y})`).assign(G, t._`+${Y}`);
          return;
        case "integer":
          Q.elseIf(t._`${z} === "boolean" || ${Y} === null
              || (${z} === "string" && ${Y} && ${Y} == +${Y} && !(${Y} % 1))`).assign(G, t._`+${Y}`);
          return;
        case "boolean":
          Q.elseIf(t._`${Y} === "false" || ${Y} === 0 || ${Y} === null`).assign(G, false).elseIf(t._`${Y} === "true" || ${Y} === 1`).assign(G, true);
          return;
        case "null":
          Q.elseIf(t._`${Y} === "" || ${Y} === 0 || ${Y} === false`), Q.assign(G, null);
          return;
        case "array":
          Q.elseIf(t._`${z} === "string" || ${z} === "number"
              || ${z} === "boolean" || ${Y} === null`).assign(G, t._`[${Y}]`);
      }
    }
  }
  function MS({ gen: $, parentData: X, parentDataProperty: J }, Q) {
    $.if(t._`${X} !== undefined`, () => $.assign(t._`${X}[${J}]`, Q));
  }
  function UU($, X, J, Q = a0.Correct) {
    let Y = Q === a0.Correct ? t.operators.EQ : t.operators.NEQ, W;
    switch ($) {
      case "null":
        return t._`${X} ${Y} null`;
      case "array":
        W = t._`Array.isArray(${X})`;
        break;
      case "object":
        W = t._`${X} && typeof ${X} == "object" && !Array.isArray(${X})`;
        break;
      case "integer":
        W = z(t._`!(${X} % 1) && !isNaN(${X})`);
        break;
      case "number":
        W = z();
        break;
      default:
        return t._`typeof ${X} ${Y} ${$}`;
    }
    return Q === a0.Correct ? W : (0, t.not)(W);
    function z(G = t.nil) {
      return (0, t.and)(t._`typeof ${X} == "number"`, G, J ? t._`isFinite(${X})` : t.nil);
    }
  }
  tw.checkDataType = UU;
  function HU($, X, J, Q) {
    if ($.length === 1) return UU($[0], X, J, Q);
    let Y, W = (0, nw.toHash)($);
    if (W.array && W.object) {
      let z = t._`typeof ${X} != "object"`;
      Y = W.null ? z : t._`!${X} || ${z}`, delete W.null, delete W.array, delete W.object;
    } else Y = t.nil;
    if (W.number) delete W.integer;
    for (let z in W) Y = (0, t.and)(Y, UU(z, X, J, Q));
    return Y;
  }
  tw.checkDataTypes = HU;
  var AS = { message: ({ schema: $ }) => `must be ${$}`, params: ({ schema: $, schemaValue: X }) => typeof $ == "string" ? t._`{type: ${$}}` : t._`{type: ${X}}` };
  function KU($) {
    let X = IS($);
    (0, qS.reportError)(X, AS);
  }
  tw.reportTypeError = KU;
  function IS($) {
    let { gen: X, data: J, schema: Q } = $, Y = (0, nw.schemaRefOrVal)($, Q, "type");
    return { gen: X, keyword: "type", data: J, schema: Q.type, schemaCode: Y, schemaValue: Y, parentSchema: Q, params: {}, it: $ };
  }
});
var XB = k((ew) => {
  Object.defineProperty(ew, "__esModule", { value: true });
  ew.assignDefaults = void 0;
  var s0 = a(), vS = Q$();
  function CS($, X) {
    let { properties: J, items: Q } = $.schema;
    if (X === "object" && J) for (let Y in J) sw($, Y, J[Y].default);
    else if (X === "array" && Array.isArray(Q)) Q.forEach((Y, W) => sw($, W, Y.default));
  }
  ew.assignDefaults = CS;
  function sw($, X, J) {
    let { gen: Q, compositeRule: Y, data: W, opts: z } = $;
    if (J === void 0) return;
    let G = s0._`${W}${(0, s0.getProperty)(X)}`;
    if (Y) {
      (0, vS.checkStrictMode)($, `default is ignored for: ${G}`);
      return;
    }
    let U = s0._`${G} === undefined`;
    if (z.useDefaults === "empty") U = s0._`${U} || ${G} === null || ${G} === ""`;
    Q.if(U, s0._`${G} = ${(0, s0.stringify)(J)}`);
  }
});
var E6 = k((QB) => {
  Object.defineProperty(QB, "__esModule", { value: true });
  QB.validateUnion = QB.validateArray = QB.usePattern = QB.callValidateCode = QB.schemaProperties = QB.allSchemaProperties = QB.noPropertyInData = QB.propertyInData = QB.isOwnProperty = QB.hasPropFunc = QB.reportMissingProp = QB.checkMissingProp = QB.checkReportMissingProp = void 0;
  var F$ = a(), VU = Q$(), J1 = b4(), kS = Q$();
  function _S($, X) {
    let { gen: J, data: Q, it: Y } = $;
    J.if(OU(J, Q, X, Y.opts.ownProperties), () => {
      $.setParams({ missingProperty: F$._`${X}` }, true), $.error();
    });
  }
  QB.checkReportMissingProp = _S;
  function xS({ gen: $, data: X, it: { opts: J } }, Q, Y) {
    return (0, F$.or)(...Q.map((W) => (0, F$.and)(OU($, X, W, J.ownProperties), F$._`${Y} = ${W}`)));
  }
  QB.checkMissingProp = xS;
  function TS($, X) {
    $.setParams({ missingProperty: X }, true), $.error();
  }
  QB.reportMissingProp = TS;
  function JB($) {
    return $.scopeValue("func", { ref: Object.prototype.hasOwnProperty, code: F$._`Object.prototype.hasOwnProperty` });
  }
  QB.hasPropFunc = JB;
  function NU($, X, J) {
    return F$._`${JB($)}.call(${X}, ${J})`;
  }
  QB.isOwnProperty = NU;
  function yS($, X, J, Q) {
    let Y = F$._`${X}${(0, F$.getProperty)(J)} !== undefined`;
    return Q ? F$._`${Y} && ${NU($, X, J)}` : Y;
  }
  QB.propertyInData = yS;
  function OU($, X, J, Q) {
    let Y = F$._`${X}${(0, F$.getProperty)(J)} === undefined`;
    return Q ? (0, F$.or)(Y, (0, F$.not)(NU($, X, J))) : Y;
  }
  QB.noPropertyInData = OU;
  function YB($) {
    return $ ? Object.keys($).filter((X) => X !== "__proto__") : [];
  }
  QB.allSchemaProperties = YB;
  function fS($, X) {
    return YB(X).filter((J) => !(0, VU.alwaysValidSchema)($, X[J]));
  }
  QB.schemaProperties = fS;
  function gS({ schemaCode: $, data: X, it: { gen: J, topSchemaRef: Q, schemaPath: Y, errorPath: W }, it: z }, G, U, H) {
    let K = H ? F$._`${$}, ${X}, ${Q}${Y}` : X, V = [[J1.default.instancePath, (0, F$.strConcat)(J1.default.instancePath, W)], [J1.default.parentData, z.parentData], [J1.default.parentDataProperty, z.parentDataProperty], [J1.default.rootData, J1.default.rootData]];
    if (z.opts.dynamicRef) V.push([J1.default.dynamicAnchors, J1.default.dynamicAnchors]);
    let N = F$._`${K}, ${J.object(...V)}`;
    return U !== F$.nil ? F$._`${G}.call(${U}, ${N})` : F$._`${G}(${N})`;
  }
  QB.callValidateCode = gS;
  var hS = F$._`new RegExp`;
  function uS({ gen: $, it: { opts: X } }, J) {
    let Q = X.unicodeRegExp ? "u" : "", { regExp: Y } = X.code, W = Y(J, Q);
    return $.scopeValue("pattern", { key: W.toString(), ref: W, code: F$._`${Y.code === "new RegExp" ? hS : (0, kS.useFunc)($, Y)}(${J}, ${Q})` });
  }
  QB.usePattern = uS;
  function mS($) {
    let { gen: X, data: J, keyword: Q, it: Y } = $, W = X.name("valid");
    if (Y.allErrors) {
      let G = X.let("valid", true);
      return z(() => X.assign(G, false)), G;
    }
    return X.var(W, true), z(() => X.break()), W;
    function z(G) {
      let U = X.const("len", F$._`${J}.length`);
      X.forRange("i", 0, U, (H) => {
        $.subschema({ keyword: Q, dataProp: H, dataPropType: VU.Type.Num }, W), X.if((0, F$.not)(W), G);
      });
    }
  }
  QB.validateArray = mS;
  function lS($) {
    let { gen: X, schema: J, keyword: Q, it: Y } = $;
    if (!Array.isArray(J)) throw Error("ajv implementation error");
    if (J.some((U) => (0, VU.alwaysValidSchema)(Y, U)) && !Y.opts.unevaluated) return;
    let z = X.let("valid", false), G = X.name("_valid");
    X.block(() => J.forEach((U, H) => {
      let K = $.subschema({ keyword: Q, schemaProp: H, compositeRule: true }, G);
      if (X.assign(z, F$._`${z} || ${G}`), !$.mergeValidEvaluated(K, G)) X.if((0, F$.not)(z));
    })), $.result(z, () => $.reset(), () => $.error(true));
  }
  QB.validateUnion = lS;
});
var KB = k((UB) => {
  Object.defineProperty(UB, "__esModule", { value: true });
  UB.validateKeywordUsage = UB.validSchemaType = UB.funcKeywordCode = UB.macroKeywordCode = void 0;
  var $6 = a(), g1 = b4(), Xv = E6(), Jv = h9();
  function Yv($, X) {
    let { gen: J, keyword: Q, schema: Y, parentSchema: W, it: z } = $, G = X.macro.call(z.self, Y, W, z), U = GB(J, Q, G);
    if (z.opts.validateSchema !== false) z.self.validateSchema(G, true);
    let H = J.name("valid");
    $.subschema({ schema: G, schemaPath: $6.nil, errSchemaPath: `${z.errSchemaPath}/${Q}`, topSchemaRef: U, compositeRule: true }, H), $.pass(H, () => $.error(true));
  }
  UB.macroKeywordCode = Yv;
  function Qv($, X) {
    var J;
    let { gen: Q, keyword: Y, schema: W, parentSchema: z, $data: G, it: U } = $;
    zv(U, X);
    let H = !G && X.compile ? X.compile.call(U.self, W, z, U) : X.validate, K = GB(Q, Y, H), V = Q.let("valid");
    $.block$data(V, N), $.ok((J = X.valid) !== null && J !== void 0 ? J : V);
    function N() {
      if (X.errors === false) {
        if (B(), X.modifying) zB($);
        D(() => $.error());
      } else {
        let j = X.async ? O() : w();
        if (X.modifying) zB($);
        D(() => Wv($, j));
      }
    }
    function O() {
      let j = Q.let("ruleErrs", null);
      return Q.try(() => B($6._`await `), (A) => Q.assign(V, false).if($6._`${A} instanceof ${U.ValidationError}`, () => Q.assign(j, $6._`${A}.errors`), () => Q.throw(A))), j;
    }
    function w() {
      let j = $6._`${K}.errors`;
      return Q.assign(j, null), B($6.nil), j;
    }
    function B(j = X.async ? $6._`await ` : $6.nil) {
      let A = U.opts.passContext ? g1.default.this : g1.default.self, I = !("compile" in X && !G || X.schema === false);
      Q.assign(V, $6._`${j}${(0, Xv.callValidateCode)($, K, A, I)}`, X.modifying);
    }
    function D(j) {
      var A;
      Q.if((0, $6.not)((A = X.valid) !== null && A !== void 0 ? A : V), j);
    }
  }
  UB.funcKeywordCode = Qv;
  function zB($) {
    let { gen: X, data: J, it: Q } = $;
    X.if(Q.parentData, () => X.assign(J, $6._`${Q.parentData}[${Q.parentDataProperty}]`));
  }
  function Wv($, X) {
    let { gen: J } = $;
    J.if($6._`Array.isArray(${X})`, () => {
      J.assign(g1.default.vErrors, $6._`${g1.default.vErrors} === null ? ${X} : ${g1.default.vErrors}.concat(${X})`).assign(g1.default.errors, $6._`${g1.default.vErrors}.length`), (0, Jv.extendErrors)($);
    }, () => $.error());
  }
  function zv({ schemaEnv: $ }, X) {
    if (X.async && !$.$async) throw Error("async keyword in sync schema");
  }
  function GB($, X, J) {
    if (J === void 0) throw Error(`keyword "${X}" failed to compile`);
    return $.scopeValue("keyword", typeof J == "function" ? { ref: J } : { ref: J, code: (0, $6.stringify)(J) });
  }
  function Gv($, X, J = false) {
    return !X.length || X.some((Q) => Q === "array" ? Array.isArray($) : Q === "object" ? $ && typeof $ == "object" && !Array.isArray($) : typeof $ == Q || J && typeof $ > "u");
  }
  UB.validSchemaType = Gv;
  function Uv({ schema: $, opts: X, self: J, errSchemaPath: Q }, Y, W) {
    if (Array.isArray(Y.keyword) ? !Y.keyword.includes(W) : Y.keyword !== W) throw Error("ajv implementation error");
    let z = Y.dependencies;
    if (z === null || z === void 0 ? void 0 : z.some((G) => !Object.prototype.hasOwnProperty.call($, G))) throw Error(`parent schema must have dependencies of ${W}: ${z.join(",")}`);
    if (Y.validateSchema) {
      if (!Y.validateSchema($[W])) {
        let U = `keyword "${W}" value is invalid at path "${Q}": ` + J.errorsText(Y.validateSchema.errors);
        if (X.validateSchema === "log") J.logger.error(U);
        else throw Error(U);
      }
    }
  }
  UB.validateKeywordUsage = Uv;
});
var wB = k((NB) => {
  Object.defineProperty(NB, "__esModule", { value: true });
  NB.extendSubschemaMode = NB.extendSubschemaData = NB.getSubschema = void 0;
  var a6 = a(), VB = Q$();
  function Nv($, { keyword: X, schemaProp: J, schema: Q, schemaPath: Y, errSchemaPath: W, topSchemaRef: z }) {
    if (X !== void 0 && Q !== void 0) throw Error('both "keyword" and "schema" passed, only one allowed');
    if (X !== void 0) {
      let G = $.schema[X];
      return J === void 0 ? { schema: G, schemaPath: a6._`${$.schemaPath}${(0, a6.getProperty)(X)}`, errSchemaPath: `${$.errSchemaPath}/${X}` } : { schema: G[J], schemaPath: a6._`${$.schemaPath}${(0, a6.getProperty)(X)}${(0, a6.getProperty)(J)}`, errSchemaPath: `${$.errSchemaPath}/${X}/${(0, VB.escapeFragment)(J)}` };
    }
    if (Q !== void 0) {
      if (Y === void 0 || W === void 0 || z === void 0) throw Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
      return { schema: Q, schemaPath: Y, topSchemaRef: z, errSchemaPath: W };
    }
    throw Error('either "keyword" or "schema" must be passed');
  }
  NB.getSubschema = Nv;
  function Ov($, X, { dataProp: J, dataPropType: Q, data: Y, dataTypes: W, propertyName: z }) {
    if (Y !== void 0 && J !== void 0) throw Error('both "data" and "dataProp" passed, only one allowed');
    let { gen: G } = X;
    if (J !== void 0) {
      let { errorPath: H, dataPathArr: K, opts: V } = X, N = G.let("data", a6._`${X.data}${(0, a6.getProperty)(J)}`, true);
      U(N), $.errorPath = a6.str`${H}${(0, VB.getErrorPath)(J, Q, V.jsPropertySyntax)}`, $.parentDataProperty = a6._`${J}`, $.dataPathArr = [...K, $.parentDataProperty];
    }
    if (Y !== void 0) {
      let H = Y instanceof a6.Name ? Y : G.let("data", Y, true);
      if (U(H), z !== void 0) $.propertyName = z;
    }
    if (W) $.dataTypes = W;
    function U(H) {
      $.data = H, $.dataLevel = X.dataLevel + 1, $.dataTypes = [], X.definedProperties = /* @__PURE__ */ new Set(), $.parentData = X.data, $.dataNames = [...X.dataNames, H];
    }
  }
  NB.extendSubschemaData = Ov;
  function wv($, { jtdDiscriminator: X, jtdMetadata: J, compositeRule: Q, createErrors: Y, allErrors: W }) {
    if (Q !== void 0) $.compositeRule = Q;
    if (Y !== void 0) $.createErrors = Y;
    if (W !== void 0) $.allErrors = W;
    $.jtdDiscriminator = X, $.jtdMetadata = J;
  }
  NB.extendSubschemaMode = wv;
});
var wU = k(($s, BB) => {
  BB.exports = function $(X, J) {
    if (X === J) return true;
    if (X && J && typeof X == "object" && typeof J == "object") {
      if (X.constructor !== J.constructor) return false;
      var Q, Y, W;
      if (Array.isArray(X)) {
        if (Q = X.length, Q != J.length) return false;
        for (Y = Q; Y-- !== 0; ) if (!$(X[Y], J[Y])) return false;
        return true;
      }
      if (X.constructor === RegExp) return X.source === J.source && X.flags === J.flags;
      if (X.valueOf !== Object.prototype.valueOf) return X.valueOf() === J.valueOf();
      if (X.toString !== Object.prototype.toString) return X.toString() === J.toString();
      if (W = Object.keys(X), Q = W.length, Q !== Object.keys(J).length) return false;
      for (Y = Q; Y-- !== 0; ) if (!Object.prototype.hasOwnProperty.call(J, W[Y])) return false;
      for (Y = Q; Y-- !== 0; ) {
        var z = W[Y];
        if (!$(X[z], J[z])) return false;
      }
      return true;
    }
    return X !== X && J !== J;
  };
});
var LB = k((Xs, qB) => {
  var Y1 = qB.exports = function($, X, J) {
    if (typeof X == "function") J = X, X = {};
    J = X.cb || J;
    var Q = typeof J == "function" ? J : J.pre || function() {
    }, Y = J.post || function() {
    };
    iQ(X, Q, Y, $, "", $);
  };
  Y1.keywords = { additionalItems: true, items: true, contains: true, additionalProperties: true, propertyNames: true, not: true, if: true, then: true, else: true };
  Y1.arrayKeywords = { items: true, allOf: true, anyOf: true, oneOf: true };
  Y1.propsKeywords = { $defs: true, definitions: true, properties: true, patternProperties: true, dependencies: true };
  Y1.skipKeywords = { default: true, enum: true, const: true, required: true, maximum: true, minimum: true, exclusiveMaximum: true, exclusiveMinimum: true, multipleOf: true, maxLength: true, minLength: true, pattern: true, format: true, maxItems: true, minItems: true, uniqueItems: true, maxProperties: true, minProperties: true };
  function iQ($, X, J, Q, Y, W, z, G, U, H) {
    if (Q && typeof Q == "object" && !Array.isArray(Q)) {
      X(Q, Y, W, z, G, U, H);
      for (var K in Q) {
        var V = Q[K];
        if (Array.isArray(V)) {
          if (K in Y1.arrayKeywords) for (var N = 0; N < V.length; N++) iQ($, X, J, V[N], Y + "/" + K + "/" + N, W, Y, K, Q, N);
        } else if (K in Y1.propsKeywords) {
          if (V && typeof V == "object") for (var O in V) iQ($, X, J, V[O], Y + "/" + K + "/" + Lv(O), W, Y, K, Q, O);
        } else if (K in Y1.keywords || $.allKeys && !(K in Y1.skipKeywords)) iQ($, X, J, V, Y + "/" + K, W, Y, K, Q);
      }
      J(Q, Y, W, z, G, U, H);
    }
  }
  function Lv($) {
    return $.replace(/~/g, "~0").replace(/\//g, "~1");
  }
});
var m9 = k((MB) => {
  Object.defineProperty(MB, "__esModule", { value: true });
  MB.getSchemaRefs = MB.resolveUrl = MB.normalizeId = MB._getFullPath = MB.getFullPath = MB.inlineRef = void 0;
  var Dv = Q$(), jv = wU(), Fv = LB(), Mv = /* @__PURE__ */ new Set(["type", "format", "pattern", "maxLength", "minLength", "maxProperties", "minProperties", "maxItems", "minItems", "maximum", "minimum", "uniqueItems", "multipleOf", "required", "enum", "const"]);
  function Av($, X = true) {
    if (typeof $ == "boolean") return true;
    if (X === true) return !BU($);
    if (!X) return false;
    return DB($) <= X;
  }
  MB.inlineRef = Av;
  var Iv = /* @__PURE__ */ new Set(["$ref", "$recursiveRef", "$recursiveAnchor", "$dynamicRef", "$dynamicAnchor"]);
  function BU($) {
    for (let X in $) {
      if (Iv.has(X)) return true;
      let J = $[X];
      if (Array.isArray(J) && J.some(BU)) return true;
      if (typeof J == "object" && BU(J)) return true;
    }
    return false;
  }
  function DB($) {
    let X = 0;
    for (let J in $) {
      if (J === "$ref") return 1 / 0;
      if (X++, Mv.has(J)) continue;
      if (typeof $[J] == "object") (0, Dv.eachItem)($[J], (Q) => X += DB(Q));
      if (X === 1 / 0) return 1 / 0;
    }
    return X;
  }
  function jB($, X = "", J) {
    if (J !== false) X = e0(X);
    let Q = $.parse(X);
    return FB($, Q);
  }
  MB.getFullPath = jB;
  function FB($, X) {
    return $.serialize(X).split("#")[0] + "#";
  }
  MB._getFullPath = FB;
  var bv = /#\/?$/;
  function e0($) {
    return $ ? $.replace(bv, "") : "";
  }
  MB.normalizeId = e0;
  function Zv($, X, J) {
    return J = e0(J), $.resolve(X, J);
  }
  MB.resolveUrl = Zv;
  var Pv = /^[a-z_][-a-z0-9._]*$/i;
  function Rv($, X) {
    if (typeof $ == "boolean") return {};
    let { schemaId: J, uriResolver: Q } = this.opts, Y = e0($[J] || X), W = { "": Y }, z = jB(Q, Y, false), G = {}, U = /* @__PURE__ */ new Set();
    return Fv($, { allKeys: true }, (V, N, O, w) => {
      if (w === void 0) return;
      let B = z + N, D = W[w];
      if (typeof V[J] == "string") D = j.call(this, V[J]);
      A.call(this, V.$anchor), A.call(this, V.$dynamicAnchor), W[N] = D;
      function j(I) {
        let x = this.opts.uriResolver.resolve;
        if (I = e0(D ? x(D, I) : I), U.has(I)) throw K(I);
        U.add(I);
        let T = this.refs[I];
        if (typeof T == "string") T = this.refs[T];
        if (typeof T == "object") H(V, T.schema, I);
        else if (I !== e0(B)) if (I[0] === "#") H(V, G[I], I), G[I] = V;
        else this.refs[I] = B;
        return I;
      }
      function A(I) {
        if (typeof I == "string") {
          if (!Pv.test(I)) throw Error(`invalid anchor "${I}"`);
          j.call(this, `#${I}`);
        }
      }
    }), G;
    function H(V, N, O) {
      if (N !== void 0 && !jv(V, N)) throw K(O);
    }
    function K(V) {
      return Error(`reference "${V}" resolves to more than one schema`);
    }
  }
  MB.getSchemaRefs = Rv;
});
var p9 = k((fB) => {
  Object.defineProperty(fB, "__esModule", { value: true });
  fB.getData = fB.KeywordCxt = fB.validateFunctionCode = void 0;
  var RB = uw(), IB = u9(), LU = GU(), nQ = u9(), _v = XB(), c9 = KB(), qU = wB(), u = a(), n = b4(), xv = m9(), Z4 = Q$(), l9 = h9();
  function Tv($) {
    if (vB($)) {
      if (CB($), SB($)) {
        gv($);
        return;
      }
    }
    EB($, () => (0, RB.topBoolOrEmptySchema)($));
  }
  fB.validateFunctionCode = Tv;
  function EB({ gen: $, validateName: X, schema: J, schemaEnv: Q, opts: Y }, W) {
    if (Y.code.es5) $.func(X, u._`${n.default.data}, ${n.default.valCxt}`, Q.$async, () => {
      $.code(u._`"use strict"; ${bB(J, Y)}`), fv($, Y), $.code(W);
    });
    else $.func(X, u._`${n.default.data}, ${yv(Y)}`, Q.$async, () => $.code(bB(J, Y)).code(W));
  }
  function yv($) {
    return u._`{${n.default.instancePath}="", ${n.default.parentData}, ${n.default.parentDataProperty}, ${n.default.rootData}=${n.default.data}${$.dynamicRef ? u._`, ${n.default.dynamicAnchors}={}` : u.nil}}={}`;
  }
  function fv($, X) {
    $.if(n.default.valCxt, () => {
      if ($.var(n.default.instancePath, u._`${n.default.valCxt}.${n.default.instancePath}`), $.var(n.default.parentData, u._`${n.default.valCxt}.${n.default.parentData}`), $.var(n.default.parentDataProperty, u._`${n.default.valCxt}.${n.default.parentDataProperty}`), $.var(n.default.rootData, u._`${n.default.valCxt}.${n.default.rootData}`), X.dynamicRef) $.var(n.default.dynamicAnchors, u._`${n.default.valCxt}.${n.default.dynamicAnchors}`);
    }, () => {
      if ($.var(n.default.instancePath, u._`""`), $.var(n.default.parentData, u._`undefined`), $.var(n.default.parentDataProperty, u._`undefined`), $.var(n.default.rootData, n.default.data), X.dynamicRef) $.var(n.default.dynamicAnchors, u._`{}`);
    });
  }
  function gv($) {
    let { schema: X, opts: J, gen: Q } = $;
    EB($, () => {
      if (J.$comment && X.$comment) _B($);
      if (cv($), Q.let(n.default.vErrors, null), Q.let(n.default.errors, 0), J.unevaluated) hv($);
      kB($), iv($);
    });
    return;
  }
  function hv($) {
    let { gen: X, validateName: J } = $;
    $.evaluated = X.const("evaluated", u._`${J}.evaluated`), X.if(u._`${$.evaluated}.dynamicProps`, () => X.assign(u._`${$.evaluated}.props`, u._`undefined`)), X.if(u._`${$.evaluated}.dynamicItems`, () => X.assign(u._`${$.evaluated}.items`, u._`undefined`));
  }
  function bB($, X) {
    let J = typeof $ == "object" && $[X.schemaId];
    return J && (X.code.source || X.code.process) ? u._`/*# sourceURL=${J} */` : u.nil;
  }
  function uv($, X) {
    if (vB($)) {
      if (CB($), SB($)) {
        mv($, X);
        return;
      }
    }
    (0, RB.boolOrEmptySchema)($, X);
  }
  function SB({ schema: $, self: X }) {
    if (typeof $ == "boolean") return !$;
    for (let J in $) if (X.RULES.all[J]) return true;
    return false;
  }
  function vB($) {
    return typeof $.schema != "boolean";
  }
  function mv($, X) {
    let { schema: J, gen: Q, opts: Y } = $;
    if (Y.$comment && J.$comment) _B($);
    pv($), dv($);
    let W = Q.const("_errs", n.default.errors);
    kB($, W), Q.var(X, u._`${W} === ${n.default.errors}`);
  }
  function CB($) {
    (0, Z4.checkUnknownRules)($), lv($);
  }
  function kB($, X) {
    if ($.opts.jtd) return ZB($, [], false, X);
    let J = (0, IB.getSchemaTypes)($.schema), Q = (0, IB.coerceAndCheckDataType)($, J);
    ZB($, J, !Q, X);
  }
  function lv($) {
    let { schema: X, errSchemaPath: J, opts: Q, self: Y } = $;
    if (X.$ref && Q.ignoreKeywordsWithRef && (0, Z4.schemaHasRulesButRef)(X, Y.RULES)) Y.logger.warn(`$ref: keywords ignored in schema at path "${J}"`);
  }
  function cv($) {
    let { schema: X, opts: J } = $;
    if (X.default !== void 0 && J.useDefaults && J.strictSchema) (0, Z4.checkStrictMode)($, "default is ignored in the schema root");
  }
  function pv($) {
    let X = $.schema[$.opts.schemaId];
    if (X) $.baseId = (0, xv.resolveUrl)($.opts.uriResolver, $.baseId, X);
  }
  function dv($) {
    if ($.schema.$async && !$.schemaEnv.$async) throw Error("async schema in sync schema");
  }
  function _B({ gen: $, schemaEnv: X, schema: J, errSchemaPath: Q, opts: Y }) {
    let W = J.$comment;
    if (Y.$comment === true) $.code(u._`${n.default.self}.logger.log(${W})`);
    else if (typeof Y.$comment == "function") {
      let z = u.str`${Q}/$comment`, G = $.scopeValue("root", { ref: X.root });
      $.code(u._`${n.default.self}.opts.$comment(${W}, ${z}, ${G}.schema)`);
    }
  }
  function iv($) {
    let { gen: X, schemaEnv: J, validateName: Q, ValidationError: Y, opts: W } = $;
    if (J.$async) X.if(u._`${n.default.errors} === 0`, () => X.return(n.default.data), () => X.throw(u._`new ${Y}(${n.default.vErrors})`));
    else {
      if (X.assign(u._`${Q}.errors`, n.default.vErrors), W.unevaluated) nv($);
      X.return(u._`${n.default.errors} === 0`);
    }
  }
  function nv({ gen: $, evaluated: X, props: J, items: Q }) {
    if (J instanceof u.Name) $.assign(u._`${X}.props`, J);
    if (Q instanceof u.Name) $.assign(u._`${X}.items`, Q);
  }
  function ZB($, X, J, Q) {
    let { gen: Y, schema: W, data: z, allErrors: G, opts: U, self: H } = $, { RULES: K } = H;
    if (W.$ref && (U.ignoreKeywordsWithRef || !(0, Z4.schemaHasRulesButRef)(W, K))) {
      Y.block(() => TB($, "$ref", K.all.$ref.definition));
      return;
    }
    if (!U.jtd) rv($, X);
    Y.block(() => {
      for (let N of K.rules) V(N);
      V(K.post);
    });
    function V(N) {
      if (!(0, LU.shouldUseGroup)(W, N)) return;
      if (N.type) {
        if (Y.if((0, nQ.checkDataType)(N.type, z, U.strictNumbers)), PB($, N), X.length === 1 && X[0] === N.type && J) Y.else(), (0, nQ.reportTypeError)($);
        Y.endIf();
      } else PB($, N);
      if (!G) Y.if(u._`${n.default.errors} === ${Q || 0}`);
    }
  }
  function PB($, X) {
    let { gen: J, schema: Q, opts: { useDefaults: Y } } = $;
    if (Y) (0, _v.assignDefaults)($, X.type);
    J.block(() => {
      for (let W of X.rules) if ((0, LU.shouldUseRule)(Q, W)) TB($, W.keyword, W.definition, X.type);
    });
  }
  function rv($, X) {
    if ($.schemaEnv.meta || !$.opts.strictTypes) return;
    if (ov($, X), !$.opts.allowUnionTypes) tv($, X);
    av($, $.dataTypes);
  }
  function ov($, X) {
    if (!X.length) return;
    if (!$.dataTypes.length) {
      $.dataTypes = X;
      return;
    }
    X.forEach((J) => {
      if (!xB($.dataTypes, J)) DU($, `type "${J}" not allowed by context "${$.dataTypes.join(",")}"`);
    }), ev($, X);
  }
  function tv($, X) {
    if (X.length > 1 && !(X.length === 2 && X.includes("null"))) DU($, "use allowUnionTypes to allow union type keyword");
  }
  function av($, X) {
    let J = $.self.RULES.all;
    for (let Q in J) {
      let Y = J[Q];
      if (typeof Y == "object" && (0, LU.shouldUseRule)($.schema, Y)) {
        let { type: W } = Y.definition;
        if (W.length && !W.some((z) => sv(X, z))) DU($, `missing type "${W.join(",")}" for keyword "${Q}"`);
      }
    }
  }
  function sv($, X) {
    return $.includes(X) || X === "number" && $.includes("integer");
  }
  function xB($, X) {
    return $.includes(X) || X === "integer" && $.includes("number");
  }
  function ev($, X) {
    let J = [];
    for (let Q of $.dataTypes) if (xB(X, Q)) J.push(Q);
    else if (X.includes("integer") && Q === "number") J.push("integer");
    $.dataTypes = J;
  }
  function DU($, X) {
    let J = $.schemaEnv.baseId + $.errSchemaPath;
    X += ` at "${J}" (strictTypes)`, (0, Z4.checkStrictMode)($, X, $.opts.strictTypes);
  }
  class jU {
    constructor($, X, J) {
      if ((0, c9.validateKeywordUsage)($, X, J), this.gen = $.gen, this.allErrors = $.allErrors, this.keyword = J, this.data = $.data, this.schema = $.schema[J], this.$data = X.$data && $.opts.$data && this.schema && this.schema.$data, this.schemaValue = (0, Z4.schemaRefOrVal)($, this.schema, J, this.$data), this.schemaType = X.schemaType, this.parentSchema = $.schema, this.params = {}, this.it = $, this.def = X, this.$data) this.schemaCode = $.gen.const("vSchema", yB(this.$data, $));
      else if (this.schemaCode = this.schemaValue, !(0, c9.validSchemaType)(this.schema, X.schemaType, X.allowUndefined)) throw Error(`${J} value must be ${JSON.stringify(X.schemaType)}`);
      if ("code" in X ? X.trackErrors : X.errors !== false) this.errsCount = $.gen.const("_errs", n.default.errors);
    }
    result($, X, J) {
      this.failResult((0, u.not)($), X, J);
    }
    failResult($, X, J) {
      if (this.gen.if($), J) J();
      else this.error();
      if (X) {
        if (this.gen.else(), X(), this.allErrors) this.gen.endIf();
      } else if (this.allErrors) this.gen.endIf();
      else this.gen.else();
    }
    pass($, X) {
      this.failResult((0, u.not)($), void 0, X);
    }
    fail($) {
      if ($ === void 0) {
        if (this.error(), !this.allErrors) this.gen.if(false);
        return;
      }
      if (this.gen.if($), this.error(), this.allErrors) this.gen.endIf();
      else this.gen.else();
    }
    fail$data($) {
      if (!this.$data) return this.fail($);
      let { schemaCode: X } = this;
      this.fail(u._`${X} !== undefined && (${(0, u.or)(this.invalid$data(), $)})`);
    }
    error($, X, J) {
      if (X) {
        this.setParams(X), this._error($, J), this.setParams({});
        return;
      }
      this._error($, J);
    }
    _error($, X) {
      ($ ? l9.reportExtraError : l9.reportError)(this, this.def.error, X);
    }
    $dataError() {
      (0, l9.reportError)(this, this.def.$dataError || l9.keyword$DataError);
    }
    reset() {
      if (this.errsCount === void 0) throw Error('add "trackErrors" to keyword definition');
      (0, l9.resetErrorsCount)(this.gen, this.errsCount);
    }
    ok($) {
      if (!this.allErrors) this.gen.if($);
    }
    setParams($, X) {
      if (X) Object.assign(this.params, $);
      else this.params = $;
    }
    block$data($, X, J = u.nil) {
      this.gen.block(() => {
        this.check$data($, J), X();
      });
    }
    check$data($ = u.nil, X = u.nil) {
      if (!this.$data) return;
      let { gen: J, schemaCode: Q, schemaType: Y, def: W } = this;
      if (J.if((0, u.or)(u._`${Q} === undefined`, X)), $ !== u.nil) J.assign($, true);
      if (Y.length || W.validateSchema) {
        if (J.elseIf(this.invalid$data()), this.$dataError(), $ !== u.nil) J.assign($, false);
      }
      J.else();
    }
    invalid$data() {
      let { gen: $, schemaCode: X, schemaType: J, def: Q, it: Y } = this;
      return (0, u.or)(W(), z());
      function W() {
        if (J.length) {
          if (!(X instanceof u.Name)) throw Error("ajv implementation error");
          let G = Array.isArray(J) ? J : [J];
          return u._`${(0, nQ.checkDataTypes)(G, X, Y.opts.strictNumbers, nQ.DataType.Wrong)}`;
        }
        return u.nil;
      }
      function z() {
        if (Q.validateSchema) {
          let G = $.scopeValue("validate$data", { ref: Q.validateSchema });
          return u._`!${G}(${X})`;
        }
        return u.nil;
      }
    }
    subschema($, X) {
      let J = (0, qU.getSubschema)(this.it, $);
      (0, qU.extendSubschemaData)(J, this.it, $), (0, qU.extendSubschemaMode)(J, $);
      let Q = { ...this.it, ...J, items: void 0, props: void 0 };
      return uv(Q, X), Q;
    }
    mergeEvaluated($, X) {
      let { it: J, gen: Q } = this;
      if (!J.opts.unevaluated) return;
      if (J.props !== true && $.props !== void 0) J.props = Z4.mergeEvaluated.props(Q, $.props, J.props, X);
      if (J.items !== true && $.items !== void 0) J.items = Z4.mergeEvaluated.items(Q, $.items, J.items, X);
    }
    mergeValidEvaluated($, X) {
      let { it: J, gen: Q } = this;
      if (J.opts.unevaluated && (J.props !== true || J.items !== true)) return Q.if(X, () => this.mergeEvaluated($, u.Name)), true;
    }
  }
  fB.KeywordCxt = jU;
  function TB($, X, J, Q) {
    let Y = new jU($, J, X);
    if ("code" in J) J.code(Y, Q);
    else if (Y.$data && J.validate) (0, c9.funcKeywordCode)(Y, J);
    else if ("macro" in J) (0, c9.macroKeywordCode)(Y, J);
    else if (J.compile || J.validate) (0, c9.funcKeywordCode)(Y, J);
  }
  var $C = /^\/(?:[^~]|~0|~1)*$/, XC = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
  function yB($, { dataLevel: X, dataNames: J, dataPathArr: Q }) {
    let Y, W;
    if ($ === "") return n.default.rootData;
    if ($[0] === "/") {
      if (!$C.test($)) throw Error(`Invalid JSON-pointer: ${$}`);
      Y = $, W = n.default.rootData;
    } else {
      let H = XC.exec($);
      if (!H) throw Error(`Invalid JSON-pointer: ${$}`);
      let K = +H[1];
      if (Y = H[2], Y === "#") {
        if (K >= X) throw Error(U("property/index", K));
        return Q[X - K];
      }
      if (K > X) throw Error(U("data", K));
      if (W = J[X - K], !Y) return W;
    }
    let z = W, G = Y.split("/");
    for (let H of G) if (H) W = u._`${W}${(0, u.getProperty)((0, Z4.unescapeJsonPointer)(H))}`, z = u._`${z} && ${W}`;
    return z;
    function U(H, K) {
      return `Cannot access ${H} ${K} levels up, current level is ${X}`;
    }
  }
  fB.getData = yB;
});
var rQ = k((uB) => {
  Object.defineProperty(uB, "__esModule", { value: true });
  class hB extends Error {
    constructor($) {
      super("validation failed");
      this.errors = $, this.ajv = this.validation = true;
    }
  }
  uB.default = hB;
});
var d9 = k((lB) => {
  Object.defineProperty(lB, "__esModule", { value: true });
  var FU = m9();
  class mB extends Error {
    constructor($, X, J, Q) {
      super(Q || `can't resolve reference ${J} from id ${X}`);
      this.missingRef = (0, FU.resolveUrl)($, X, J), this.missingSchema = (0, FU.normalizeId)((0, FU.getFullPath)($, this.missingRef));
    }
  }
  lB.default = mB;
});
var tQ = k((dB) => {
  Object.defineProperty(dB, "__esModule", { value: true });
  dB.resolveSchema = dB.getCompilingSchema = dB.resolveRef = dB.compileSchema = dB.SchemaEnv = void 0;
  var l6 = a(), zC = rQ(), h1 = b4(), c6 = m9(), cB = Q$(), GC = p9();
  class i9 {
    constructor($) {
      var X;
      this.refs = {}, this.dynamicAnchors = {};
      let J;
      if (typeof $.schema == "object") J = $.schema;
      this.schema = $.schema, this.schemaId = $.schemaId, this.root = $.root || this, this.baseId = (X = $.baseId) !== null && X !== void 0 ? X : (0, c6.normalizeId)(J === null || J === void 0 ? void 0 : J[$.schemaId || "$id"]), this.schemaPath = $.schemaPath, this.localRefs = $.localRefs, this.meta = $.meta, this.$async = J === null || J === void 0 ? void 0 : J.$async, this.refs = {};
    }
  }
  dB.SchemaEnv = i9;
  function AU($) {
    let X = pB.call(this, $);
    if (X) return X;
    let J = (0, c6.getFullPath)(this.opts.uriResolver, $.root.baseId), { es5: Q, lines: Y } = this.opts.code, { ownProperties: W } = this.opts, z = new l6.CodeGen(this.scope, { es5: Q, lines: Y, ownProperties: W }), G;
    if ($.$async) G = z.scopeValue("Error", { ref: zC.default, code: l6._`require("ajv/dist/runtime/validation_error").default` });
    let U = z.scopeName("validate");
    $.validateName = U;
    let H = { gen: z, allErrors: this.opts.allErrors, data: h1.default.data, parentData: h1.default.parentData, parentDataProperty: h1.default.parentDataProperty, dataNames: [h1.default.data], dataPathArr: [l6.nil], dataLevel: 0, dataTypes: [], definedProperties: /* @__PURE__ */ new Set(), topSchemaRef: z.scopeValue("schema", this.opts.code.source === true ? { ref: $.schema, code: (0, l6.stringify)($.schema) } : { ref: $.schema }), validateName: U, ValidationError: G, schema: $.schema, schemaEnv: $, rootId: J, baseId: $.baseId || J, schemaPath: l6.nil, errSchemaPath: $.schemaPath || (this.opts.jtd ? "" : "#"), errorPath: l6._`""`, opts: this.opts, self: this }, K;
    try {
      this._compilations.add($), (0, GC.validateFunctionCode)(H), z.optimize(this.opts.code.optimize);
      let V = z.toString();
      if (K = `${z.scopeRefs(h1.default.scope)}return ${V}`, this.opts.code.process) K = this.opts.code.process(K, $);
      let O = Function(`${h1.default.self}`, `${h1.default.scope}`, K)(this, this.scope.get());
      if (this.scope.value(U, { ref: O }), O.errors = null, O.schema = $.schema, O.schemaEnv = $, $.$async) O.$async = true;
      if (this.opts.code.source === true) O.source = { validateName: U, validateCode: V, scopeValues: z._values };
      if (this.opts.unevaluated) {
        let { props: w, items: B } = H;
        if (O.evaluated = { props: w instanceof l6.Name ? void 0 : w, items: B instanceof l6.Name ? void 0 : B, dynamicProps: w instanceof l6.Name, dynamicItems: B instanceof l6.Name }, O.source) O.source.evaluated = (0, l6.stringify)(O.evaluated);
      }
      return $.validate = O, $;
    } catch (V) {
      if (delete $.validate, delete $.validateName, K) this.logger.error("Error compiling schema, function code:", K);
      throw V;
    } finally {
      this._compilations.delete($);
    }
  }
  dB.compileSchema = AU;
  function UC($, X, J) {
    var Q;
    J = (0, c6.resolveUrl)(this.opts.uriResolver, X, J);
    let Y = $.refs[J];
    if (Y) return Y;
    let W = VC.call(this, $, J);
    if (W === void 0) {
      let z = (Q = $.localRefs) === null || Q === void 0 ? void 0 : Q[J], { schemaId: G } = this.opts;
      if (z) W = new i9({ schema: z, schemaId: G, root: $, baseId: X });
    }
    if (W === void 0) return;
    return $.refs[J] = HC.call(this, W);
  }
  dB.resolveRef = UC;
  function HC($) {
    if ((0, c6.inlineRef)($.schema, this.opts.inlineRefs)) return $.schema;
    return $.validate ? $ : AU.call(this, $);
  }
  function pB($) {
    for (let X of this._compilations) if (KC(X, $)) return X;
  }
  dB.getCompilingSchema = pB;
  function KC($, X) {
    return $.schema === X.schema && $.root === X.root && $.baseId === X.baseId;
  }
  function VC($, X) {
    let J;
    while (typeof (J = this.refs[X]) == "string") X = J;
    return J || this.schemas[X] || oQ.call(this, $, X);
  }
  function oQ($, X) {
    let J = this.opts.uriResolver.parse(X), Q = (0, c6._getFullPath)(this.opts.uriResolver, J), Y = (0, c6.getFullPath)(this.opts.uriResolver, $.baseId, void 0);
    if (Object.keys($.schema).length > 0 && Q === Y) return MU.call(this, J, $);
    let W = (0, c6.normalizeId)(Q), z = this.refs[W] || this.schemas[W];
    if (typeof z == "string") {
      let G = oQ.call(this, $, z);
      if (typeof (G === null || G === void 0 ? void 0 : G.schema) !== "object") return;
      return MU.call(this, J, G);
    }
    if (typeof (z === null || z === void 0 ? void 0 : z.schema) !== "object") return;
    if (!z.validate) AU.call(this, z);
    if (W === (0, c6.normalizeId)(X)) {
      let { schema: G } = z, { schemaId: U } = this.opts, H = G[U];
      if (H) Y = (0, c6.resolveUrl)(this.opts.uriResolver, Y, H);
      return new i9({ schema: G, schemaId: U, root: $, baseId: Y });
    }
    return MU.call(this, J, z);
  }
  dB.resolveSchema = oQ;
  var NC = /* @__PURE__ */ new Set(["properties", "patternProperties", "enum", "dependencies", "definitions"]);
  function MU($, { baseId: X, schema: J, root: Q }) {
    var Y;
    if (((Y = $.fragment) === null || Y === void 0 ? void 0 : Y[0]) !== "/") return;
    for (let G of $.fragment.slice(1).split("/")) {
      if (typeof J === "boolean") return;
      let U = J[(0, cB.unescapeFragment)(G)];
      if (U === void 0) return;
      J = U;
      let H = typeof J === "object" && J[this.opts.schemaId];
      if (!NC.has(G) && H) X = (0, c6.resolveUrl)(this.opts.uriResolver, X, H);
    }
    let W;
    if (typeof J != "boolean" && J.$ref && !(0, cB.schemaHasRulesButRef)(J, this.RULES)) {
      let G = (0, c6.resolveUrl)(this.opts.uriResolver, X, J.$ref);
      W = oQ.call(this, Q, G);
    }
    let { schemaId: z } = this.opts;
    if (W = W || new i9({ schema: J, schemaId: z, root: Q, baseId: X }), W.schema !== W.root.schema) return W;
    return;
  }
});
var nB = k((Gs, LC) => {
  LC.exports = { $id: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#", description: "Meta-schema for $data reference (JSON AnySchema extension proposal)", type: "object", required: ["$data"], properties: { $data: { type: "string", anyOf: [{ format: "relative-json-pointer" }, { format: "json-pointer" }] } }, additionalProperties: false };
});
var oB = k((Us, rB) => {
  var DC = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, a: 10, A: 10, b: 11, B: 11, c: 12, C: 12, d: 13, D: 13, e: 14, E: 14, f: 15, F: 15 };
  rB.exports = { HEX: DC };
});
var Yq = k((Hs, Jq) => {
  var { HEX: jC } = oB(), FC = /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u;
  function eB($) {
    if (Xq($, ".") < 3) return { host: $, isIPV4: false };
    let X = $.match(FC) || [], [J] = X;
    if (J) return { host: AC(J, "."), isIPV4: true };
    else return { host: $, isIPV4: false };
  }
  function IU($, X = false) {
    let J = "", Q = true;
    for (let Y of $) {
      if (jC[Y] === void 0) return;
      if (Y !== "0" && Q === true) Q = false;
      if (!Q) J += Y;
    }
    if (X && J.length === 0) J = "0";
    return J;
  }
  function MC($) {
    let X = 0, J = { error: false, address: "", zone: "" }, Q = [], Y = [], W = false, z = false, G = false;
    function U() {
      if (Y.length) {
        if (W === false) {
          let H = IU(Y);
          if (H !== void 0) Q.push(H);
          else return J.error = true, false;
        }
        Y.length = 0;
      }
      return true;
    }
    for (let H = 0; H < $.length; H++) {
      let K = $[H];
      if (K === "[" || K === "]") continue;
      if (K === ":") {
        if (z === true) G = true;
        if (!U()) break;
        if (X++, Q.push(":"), X > 7) {
          J.error = true;
          break;
        }
        if (H - 1 >= 0 && $[H - 1] === ":") z = true;
        continue;
      } else if (K === "%") {
        if (!U()) break;
        W = true;
      } else {
        Y.push(K);
        continue;
      }
    }
    if (Y.length) if (W) J.zone = Y.join("");
    else if (G) Q.push(Y.join(""));
    else Q.push(IU(Y));
    return J.address = Q.join(""), J;
  }
  function $q($) {
    if (Xq($, ":") < 2) return { host: $, isIPV6: false };
    let X = MC($);
    if (!X.error) {
      let { address: J, address: Q } = X;
      if (X.zone) J += "%" + X.zone, Q += "%25" + X.zone;
      return { host: J, escapedHost: Q, isIPV6: true };
    } else return { host: $, isIPV6: false };
  }
  function AC($, X) {
    let J = "", Q = true, Y = $.length;
    for (let W = 0; W < Y; W++) {
      let z = $[W];
      if (z === "0" && Q) {
        if (W + 1 <= Y && $[W + 1] === X || W + 1 === Y) J += z, Q = false;
      } else {
        if (z === X) Q = true;
        else Q = false;
        J += z;
      }
    }
    return J;
  }
  function Xq($, X) {
    let J = 0;
    for (let Q = 0; Q < $.length; Q++) if ($[Q] === X) J++;
    return J;
  }
  var tB = /^\.\.?\//u, aB = /^\/\.(?:\/|$)/u, sB = /^\/\.\.(?:\/|$)/u, IC = /^\/?(?:.|\n)*?(?=\/|$)/u;
  function bC($) {
    let X = [];
    while ($.length) if ($.match(tB)) $ = $.replace(tB, "");
    else if ($.match(aB)) $ = $.replace(aB, "/");
    else if ($.match(sB)) $ = $.replace(sB, "/"), X.pop();
    else if ($ === "." || $ === "..") $ = "";
    else {
      let J = $.match(IC);
      if (J) {
        let Q = J[0];
        $ = $.slice(Q.length), X.push(Q);
      } else throw Error("Unexpected dot segment condition");
    }
    return X.join("");
  }
  function ZC($, X) {
    let J = X !== true ? escape : unescape;
    if ($.scheme !== void 0) $.scheme = J($.scheme);
    if ($.userinfo !== void 0) $.userinfo = J($.userinfo);
    if ($.host !== void 0) $.host = J($.host);
    if ($.path !== void 0) $.path = J($.path);
    if ($.query !== void 0) $.query = J($.query);
    if ($.fragment !== void 0) $.fragment = J($.fragment);
    return $;
  }
  function PC($) {
    let X = [];
    if ($.userinfo !== void 0) X.push($.userinfo), X.push("@");
    if ($.host !== void 0) {
      let J = unescape($.host), Q = eB(J);
      if (Q.isIPV4) J = Q.host;
      else {
        let Y = $q(Q.host);
        if (Y.isIPV6 === true) J = `[${Y.escapedHost}]`;
        else J = $.host;
      }
      X.push(J);
    }
    if (typeof $.port === "number" || typeof $.port === "string") X.push(":"), X.push(String($.port));
    return X.length ? X.join("") : void 0;
  }
  Jq.exports = { recomposeAuthority: PC, normalizeComponentEncoding: ZC, removeDotSegments: bC, normalizeIPv4: eB, normalizeIPv6: $q, stringArrayToHexStripped: IU };
});
var Hq = k((Ks, Uq) => {
  var RC = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu, EC = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu;
  function Qq($) {
    return typeof $.secure === "boolean" ? $.secure : String($.scheme).toLowerCase() === "wss";
  }
  function Wq($) {
    if (!$.host) $.error = $.error || "HTTP URIs must have a host.";
    return $;
  }
  function zq($) {
    let X = String($.scheme).toLowerCase() === "https";
    if ($.port === (X ? 443 : 80) || $.port === "") $.port = void 0;
    if (!$.path) $.path = "/";
    return $;
  }
  function SC($) {
    return $.secure = Qq($), $.resourceName = ($.path || "/") + ($.query ? "?" + $.query : ""), $.path = void 0, $.query = void 0, $;
  }
  function vC($) {
    if ($.port === (Qq($) ? 443 : 80) || $.port === "") $.port = void 0;
    if (typeof $.secure === "boolean") $.scheme = $.secure ? "wss" : "ws", $.secure = void 0;
    if ($.resourceName) {
      let [X, J] = $.resourceName.split("?");
      $.path = X && X !== "/" ? X : void 0, $.query = J, $.resourceName = void 0;
    }
    return $.fragment = void 0, $;
  }
  function CC($, X) {
    if (!$.path) return $.error = "URN can not be parsed", $;
    let J = $.path.match(EC);
    if (J) {
      let Q = X.scheme || $.scheme || "urn";
      $.nid = J[1].toLowerCase(), $.nss = J[2];
      let Y = `${Q}:${X.nid || $.nid}`, W = bU[Y];
      if ($.path = void 0, W) $ = W.parse($, X);
    } else $.error = $.error || "URN can not be parsed.";
    return $;
  }
  function kC($, X) {
    let J = X.scheme || $.scheme || "urn", Q = $.nid.toLowerCase(), Y = `${J}:${X.nid || Q}`, W = bU[Y];
    if (W) $ = W.serialize($, X);
    let z = $, G = $.nss;
    return z.path = `${Q || X.nid}:${G}`, X.skipEscape = true, z;
  }
  function _C($, X) {
    let J = $;
    if (J.uuid = J.nss, J.nss = void 0, !X.tolerant && (!J.uuid || !RC.test(J.uuid))) J.error = J.error || "UUID is not valid.";
    return J;
  }
  function xC($) {
    let X = $;
    return X.nss = ($.uuid || "").toLowerCase(), X;
  }
  var Gq = { scheme: "http", domainHost: true, parse: Wq, serialize: zq }, TC = { scheme: "https", domainHost: Gq.domainHost, parse: Wq, serialize: zq }, aQ = { scheme: "ws", domainHost: true, parse: SC, serialize: vC }, yC = { scheme: "wss", domainHost: aQ.domainHost, parse: aQ.parse, serialize: aQ.serialize }, fC = { scheme: "urn", parse: CC, serialize: kC, skipNormalize: true }, gC = { scheme: "urn:uuid", parse: _C, serialize: xC, skipNormalize: true }, bU = { http: Gq, https: TC, ws: aQ, wss: yC, urn: fC, "urn:uuid": gC };
  Uq.exports = bU;
});
var Vq = k((Vs, eQ) => {
  var { normalizeIPv6: hC, normalizeIPv4: uC, removeDotSegments: n9, recomposeAuthority: mC, normalizeComponentEncoding: sQ } = Yq(), ZU = Hq();
  function lC($, X) {
    if (typeof $ === "string") $ = s6(P4($, X), X);
    else if (typeof $ === "object") $ = P4(s6($, X), X);
    return $;
  }
  function cC($, X, J) {
    let Q = Object.assign({ scheme: "null" }, J), Y = Kq(P4($, Q), P4(X, Q), Q, true);
    return s6(Y, { ...Q, skipEscape: true });
  }
  function Kq($, X, J, Q) {
    let Y = {};
    if (!Q) $ = P4(s6($, J), J), X = P4(s6(X, J), J);
    if (J = J || {}, !J.tolerant && X.scheme) Y.scheme = X.scheme, Y.userinfo = X.userinfo, Y.host = X.host, Y.port = X.port, Y.path = n9(X.path || ""), Y.query = X.query;
    else {
      if (X.userinfo !== void 0 || X.host !== void 0 || X.port !== void 0) Y.userinfo = X.userinfo, Y.host = X.host, Y.port = X.port, Y.path = n9(X.path || ""), Y.query = X.query;
      else {
        if (!X.path) if (Y.path = $.path, X.query !== void 0) Y.query = X.query;
        else Y.query = $.query;
        else {
          if (X.path.charAt(0) === "/") Y.path = n9(X.path);
          else {
            if (($.userinfo !== void 0 || $.host !== void 0 || $.port !== void 0) && !$.path) Y.path = "/" + X.path;
            else if (!$.path) Y.path = X.path;
            else Y.path = $.path.slice(0, $.path.lastIndexOf("/") + 1) + X.path;
            Y.path = n9(Y.path);
          }
          Y.query = X.query;
        }
        Y.userinfo = $.userinfo, Y.host = $.host, Y.port = $.port;
      }
      Y.scheme = $.scheme;
    }
    return Y.fragment = X.fragment, Y;
  }
  function pC($, X, J) {
    if (typeof $ === "string") $ = unescape($), $ = s6(sQ(P4($, J), true), { ...J, skipEscape: true });
    else if (typeof $ === "object") $ = s6(sQ($, true), { ...J, skipEscape: true });
    if (typeof X === "string") X = unescape(X), X = s6(sQ(P4(X, J), true), { ...J, skipEscape: true });
    else if (typeof X === "object") X = s6(sQ(X, true), { ...J, skipEscape: true });
    return $.toLowerCase() === X.toLowerCase();
  }
  function s6($, X) {
    let J = { host: $.host, scheme: $.scheme, userinfo: $.userinfo, port: $.port, path: $.path, query: $.query, nid: $.nid, nss: $.nss, uuid: $.uuid, fragment: $.fragment, reference: $.reference, resourceName: $.resourceName, secure: $.secure, error: "" }, Q = Object.assign({}, X), Y = [], W = ZU[(Q.scheme || J.scheme || "").toLowerCase()];
    if (W && W.serialize) W.serialize(J, Q);
    if (J.path !== void 0) if (!Q.skipEscape) {
      if (J.path = escape(J.path), J.scheme !== void 0) J.path = J.path.split("%3A").join(":");
    } else J.path = unescape(J.path);
    if (Q.reference !== "suffix" && J.scheme) Y.push(J.scheme, ":");
    let z = mC(J);
    if (z !== void 0) {
      if (Q.reference !== "suffix") Y.push("//");
      if (Y.push(z), J.path && J.path.charAt(0) !== "/") Y.push("/");
    }
    if (J.path !== void 0) {
      let G = J.path;
      if (!Q.absolutePath && (!W || !W.absolutePath)) G = n9(G);
      if (z === void 0) G = G.replace(/^\/\//u, "/%2F");
      Y.push(G);
    }
    if (J.query !== void 0) Y.push("?", J.query);
    if (J.fragment !== void 0) Y.push("#", J.fragment);
    return Y.join("");
  }
  var dC = Array.from({ length: 127 }, ($, X) => /[^!"$&'()*+,\-.;=_`a-z{}~]/u.test(String.fromCharCode(X)));
  function iC($) {
    let X = 0;
    for (let J = 0, Q = $.length; J < Q; ++J) if (X = $.charCodeAt(J), X > 126 || dC[X]) return true;
    return false;
  }
  var nC = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
  function P4($, X) {
    let J = Object.assign({}, X), Q = { scheme: void 0, userinfo: void 0, host: "", port: void 0, path: "", query: void 0, fragment: void 0 }, Y = $.indexOf("%") !== -1, W = false;
    if (J.reference === "suffix") $ = (J.scheme ? J.scheme + ":" : "") + "//" + $;
    let z = $.match(nC);
    if (z) {
      if (Q.scheme = z[1], Q.userinfo = z[3], Q.host = z[4], Q.port = parseInt(z[5], 10), Q.path = z[6] || "", Q.query = z[7], Q.fragment = z[8], isNaN(Q.port)) Q.port = z[5];
      if (Q.host) {
        let U = uC(Q.host);
        if (U.isIPV4 === false) {
          let H = hC(U.host);
          Q.host = H.host.toLowerCase(), W = H.isIPV6;
        } else Q.host = U.host, W = true;
      }
      if (Q.scheme === void 0 && Q.userinfo === void 0 && Q.host === void 0 && Q.port === void 0 && Q.query === void 0 && !Q.path) Q.reference = "same-document";
      else if (Q.scheme === void 0) Q.reference = "relative";
      else if (Q.fragment === void 0) Q.reference = "absolute";
      else Q.reference = "uri";
      if (J.reference && J.reference !== "suffix" && J.reference !== Q.reference) Q.error = Q.error || "URI is not a " + J.reference + " reference.";
      let G = ZU[(J.scheme || Q.scheme || "").toLowerCase()];
      if (!J.unicodeSupport && (!G || !G.unicodeSupport)) {
        if (Q.host && (J.domainHost || G && G.domainHost) && W === false && iC(Q.host)) try {
          Q.host = URL.domainToASCII(Q.host.toLowerCase());
        } catch (U) {
          Q.error = Q.error || "Host's domain name can not be converted to ASCII: " + U;
        }
      }
      if (!G || G && !G.skipNormalize) {
        if (Y && Q.scheme !== void 0) Q.scheme = unescape(Q.scheme);
        if (Y && Q.host !== void 0) Q.host = unescape(Q.host);
        if (Q.path) Q.path = escape(unescape(Q.path));
        if (Q.fragment) Q.fragment = encodeURI(decodeURIComponent(Q.fragment));
      }
      if (G && G.parse) G.parse(Q, J);
    } else Q.error = Q.error || "URI can not be parsed.";
    return Q;
  }
  var PU = { SCHEMES: ZU, normalize: lC, resolve: cC, resolveComponents: Kq, equal: pC, serialize: s6, parse: P4 };
  eQ.exports = PU;
  eQ.exports.default = PU;
  eQ.exports.fastUri = PU;
});
var wq = k((Oq) => {
  Object.defineProperty(Oq, "__esModule", { value: true });
  var Nq = Vq();
  Nq.code = 'require("ajv/dist/runtime/uri").default';
  Oq.default = Nq;
});
var Aq = k((R4) => {
  Object.defineProperty(R4, "__esModule", { value: true });
  R4.CodeGen = R4.Name = R4.nil = R4.stringify = R4.str = R4._ = R4.KeywordCxt = void 0;
  var oC = p9();
  Object.defineProperty(R4, "KeywordCxt", { enumerable: true, get: function() {
    return oC.KeywordCxt;
  } });
  var $8 = a();
  Object.defineProperty(R4, "_", { enumerable: true, get: function() {
    return $8._;
  } });
  Object.defineProperty(R4, "str", { enumerable: true, get: function() {
    return $8.str;
  } });
  Object.defineProperty(R4, "stringify", { enumerable: true, get: function() {
    return $8.stringify;
  } });
  Object.defineProperty(R4, "nil", { enumerable: true, get: function() {
    return $8.nil;
  } });
  Object.defineProperty(R4, "Name", { enumerable: true, get: function() {
    return $8.Name;
  } });
  Object.defineProperty(R4, "CodeGen", { enumerable: true, get: function() {
    return $8.CodeGen;
  } });
  var tC = rQ(), jq = d9(), aC = zU(), r9 = tQ(), sC = a(), o9 = m9(), $5 = u9(), EU = Q$(), Bq = nB(), eC = wq(), Fq = ($, X) => new RegExp($, X);
  Fq.code = "new RegExp";
  var $k = ["removeAdditional", "useDefaults", "coerceTypes"], Xk = /* @__PURE__ */ new Set(["validate", "serialize", "parse", "wrapper", "root", "schema", "keyword", "pattern", "formats", "validate$data", "func", "obj", "Error"]), Jk = { errorDataPath: "", format: "`validateFormats: false` can be used instead.", nullable: '"nullable" keyword is supported by default.', jsonPointers: "Deprecated jsPropertySyntax can be used instead.", extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.", missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.", processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`", sourceCode: "Use option `code: {source: true}`", strictDefaults: "It is default now, see option `strict`.", strictKeywords: "It is default now, see option `strict`.", uniqueItems: '"uniqueItems" keyword is always validated.', unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).", cache: "Map is used as cache, schema object as key.", serialize: "Map is used as cache, schema object as key.", ajvErrors: "It is default now." }, Yk = { ignoreKeywordsWithRef: "", jsPropertySyntax: "", unicode: '"minLength"/"maxLength" account for unicode characters by default.' }, qq = 200;
  function Qk($) {
    var X, J, Q, Y, W, z, G, U, H, K, V, N, O, w, B, D, j, A, I, x, T, U$, T$, n$, X4;
    let X6 = $.strict, U1 = (X = $.code) === null || X === void 0 ? void 0 : X.optimize, l1 = U1 === true || U1 === void 0 ? 1 : U1 || 0, J4 = (Q = (J = $.code) === null || J === void 0 ? void 0 : J.regExp) !== null && Q !== void 0 ? Q : Fq, z8 = (Y = $.uriResolver) !== null && Y !== void 0 ? Y : eC.default;
    return { strictSchema: (z = (W = $.strictSchema) !== null && W !== void 0 ? W : X6) !== null && z !== void 0 ? z : true, strictNumbers: (U = (G = $.strictNumbers) !== null && G !== void 0 ? G : X6) !== null && U !== void 0 ? U : true, strictTypes: (K = (H = $.strictTypes) !== null && H !== void 0 ? H : X6) !== null && K !== void 0 ? K : "log", strictTuples: (N = (V = $.strictTuples) !== null && V !== void 0 ? V : X6) !== null && N !== void 0 ? N : "log", strictRequired: (w = (O = $.strictRequired) !== null && O !== void 0 ? O : X6) !== null && w !== void 0 ? w : false, code: $.code ? { ...$.code, optimize: l1, regExp: J4 } : { optimize: l1, regExp: J4 }, loopRequired: (B = $.loopRequired) !== null && B !== void 0 ? B : qq, loopEnum: (D = $.loopEnum) !== null && D !== void 0 ? D : qq, meta: (j = $.meta) !== null && j !== void 0 ? j : true, messages: (A = $.messages) !== null && A !== void 0 ? A : true, inlineRefs: (I = $.inlineRefs) !== null && I !== void 0 ? I : true, schemaId: (x = $.schemaId) !== null && x !== void 0 ? x : "$id", addUsedSchema: (T = $.addUsedSchema) !== null && T !== void 0 ? T : true, validateSchema: (U$ = $.validateSchema) !== null && U$ !== void 0 ? U$ : true, validateFormats: (T$ = $.validateFormats) !== null && T$ !== void 0 ? T$ : true, unicodeRegExp: (n$ = $.unicodeRegExp) !== null && n$ !== void 0 ? n$ : true, int32range: (X4 = $.int32range) !== null && X4 !== void 0 ? X4 : true, uriResolver: z8 };
  }
  class X5 {
    constructor($ = {}) {
      this.schemas = {}, this.refs = {}, this.formats = {}, this._compilations = /* @__PURE__ */ new Set(), this._loading = {}, this._cache = /* @__PURE__ */ new Map(), $ = this.opts = { ...$, ...Qk($) };
      let { es5: X, lines: J } = this.opts.code;
      this.scope = new sC.ValueScope({ scope: {}, prefixes: Xk, es5: X, lines: J }), this.logger = Kk($.logger);
      let Q = $.validateFormats;
      if ($.validateFormats = false, this.RULES = (0, aC.getRules)(), Lq.call(this, Jk, $, "NOT SUPPORTED"), Lq.call(this, Yk, $, "DEPRECATED", "warn"), this._metaOpts = Uk.call(this), $.formats) zk.call(this);
      if (this._addVocabularies(), this._addDefaultMetaSchema(), $.keywords) Gk.call(this, $.keywords);
      if (typeof $.meta == "object") this.addMetaSchema($.meta);
      Wk.call(this), $.validateFormats = Q;
    }
    _addVocabularies() {
      this.addKeyword("$async");
    }
    _addDefaultMetaSchema() {
      let { $data: $, meta: X, schemaId: J } = this.opts, Q = Bq;
      if (J === "id") Q = { ...Bq }, Q.id = Q.$id, delete Q.$id;
      if (X && $) this.addMetaSchema(Q, Q[J], false);
    }
    defaultMeta() {
      let { meta: $, schemaId: X } = this.opts;
      return this.opts.defaultMeta = typeof $ == "object" ? $[X] || $ : void 0;
    }
    validate($, X) {
      let J;
      if (typeof $ == "string") {
        if (J = this.getSchema($), !J) throw Error(`no schema with key or ref "${$}"`);
      } else J = this.compile($);
      let Q = J(X);
      if (!("$async" in J)) this.errors = J.errors;
      return Q;
    }
    compile($, X) {
      let J = this._addSchema($, X);
      return J.validate || this._compileSchemaEnv(J);
    }
    compileAsync($, X) {
      if (typeof this.opts.loadSchema != "function") throw Error("options.loadSchema should be a function");
      let { loadSchema: J } = this.opts;
      return Q.call(this, $, X);
      async function Q(H, K) {
        await Y.call(this, H.$schema);
        let V = this._addSchema(H, K);
        return V.validate || W.call(this, V);
      }
      async function Y(H) {
        if (H && !this.getSchema(H)) await Q.call(this, { $ref: H }, true);
      }
      async function W(H) {
        try {
          return this._compileSchemaEnv(H);
        } catch (K) {
          if (!(K instanceof jq.default)) throw K;
          return z.call(this, K), await G.call(this, K.missingSchema), W.call(this, H);
        }
      }
      function z({ missingSchema: H, missingRef: K }) {
        if (this.refs[H]) throw Error(`AnySchema ${H} is loaded but ${K} cannot be resolved`);
      }
      async function G(H) {
        let K = await U.call(this, H);
        if (!this.refs[H]) await Y.call(this, K.$schema);
        if (!this.refs[H]) this.addSchema(K, H, X);
      }
      async function U(H) {
        let K = this._loading[H];
        if (K) return K;
        try {
          return await (this._loading[H] = J(H));
        } finally {
          delete this._loading[H];
        }
      }
    }
    addSchema($, X, J, Q = this.opts.validateSchema) {
      if (Array.isArray($)) {
        for (let W of $) this.addSchema(W, void 0, J, Q);
        return this;
      }
      let Y;
      if (typeof $ === "object") {
        let { schemaId: W } = this.opts;
        if (Y = $[W], Y !== void 0 && typeof Y != "string") throw Error(`schema ${W} must be string`);
      }
      return X = (0, o9.normalizeId)(X || Y), this._checkUnique(X), this.schemas[X] = this._addSchema($, J, X, Q, true), this;
    }
    addMetaSchema($, X, J = this.opts.validateSchema) {
      return this.addSchema($, X, true, J), this;
    }
    validateSchema($, X) {
      if (typeof $ == "boolean") return true;
      let J;
      if (J = $.$schema, J !== void 0 && typeof J != "string") throw Error("$schema must be a string");
      if (J = J || this.opts.defaultMeta || this.defaultMeta(), !J) return this.logger.warn("meta-schema not available"), this.errors = null, true;
      let Q = this.validate(J, $);
      if (!Q && X) {
        let Y = "schema is invalid: " + this.errorsText();
        if (this.opts.validateSchema === "log") this.logger.error(Y);
        else throw Error(Y);
      }
      return Q;
    }
    getSchema($) {
      let X;
      while (typeof (X = Dq.call(this, $)) == "string") $ = X;
      if (X === void 0) {
        let { schemaId: J } = this.opts, Q = new r9.SchemaEnv({ schema: {}, schemaId: J });
        if (X = r9.resolveSchema.call(this, Q, $), !X) return;
        this.refs[$] = X;
      }
      return X.validate || this._compileSchemaEnv(X);
    }
    removeSchema($) {
      if ($ instanceof RegExp) return this._removeAllSchemas(this.schemas, $), this._removeAllSchemas(this.refs, $), this;
      switch (typeof $) {
        case "undefined":
          return this._removeAllSchemas(this.schemas), this._removeAllSchemas(this.refs), this._cache.clear(), this;
        case "string": {
          let X = Dq.call(this, $);
          if (typeof X == "object") this._cache.delete(X.schema);
          return delete this.schemas[$], delete this.refs[$], this;
        }
        case "object": {
          let X = $;
          this._cache.delete(X);
          let J = $[this.opts.schemaId];
          if (J) J = (0, o9.normalizeId)(J), delete this.schemas[J], delete this.refs[J];
          return this;
        }
        default:
          throw Error("ajv.removeSchema: invalid parameter");
      }
    }
    addVocabulary($) {
      for (let X of $) this.addKeyword(X);
      return this;
    }
    addKeyword($, X) {
      let J;
      if (typeof $ == "string") {
        if (J = $, typeof X == "object") this.logger.warn("these parameters are deprecated, see docs for addKeyword"), X.keyword = J;
      } else if (typeof $ == "object" && X === void 0) {
        if (X = $, J = X.keyword, Array.isArray(J) && !J.length) throw Error("addKeywords: keyword must be string or non-empty array");
      } else throw Error("invalid addKeywords parameters");
      if (Nk.call(this, J, X), !X) return (0, EU.eachItem)(J, (Y) => RU.call(this, Y)), this;
      wk.call(this, X);
      let Q = { ...X, type: (0, $5.getJSONTypes)(X.type), schemaType: (0, $5.getJSONTypes)(X.schemaType) };
      return (0, EU.eachItem)(J, Q.type.length === 0 ? (Y) => RU.call(this, Y, Q) : (Y) => Q.type.forEach((W) => RU.call(this, Y, Q, W))), this;
    }
    getKeyword($) {
      let X = this.RULES.all[$];
      return typeof X == "object" ? X.definition : !!X;
    }
    removeKeyword($) {
      let { RULES: X } = this;
      delete X.keywords[$], delete X.all[$];
      for (let J of X.rules) {
        let Q = J.rules.findIndex((Y) => Y.keyword === $);
        if (Q >= 0) J.rules.splice(Q, 1);
      }
      return this;
    }
    addFormat($, X) {
      if (typeof X == "string") X = new RegExp(X);
      return this.formats[$] = X, this;
    }
    errorsText($ = this.errors, { separator: X = ", ", dataVar: J = "data" } = {}) {
      if (!$ || $.length === 0) return "No errors";
      return $.map((Q) => `${J}${Q.instancePath} ${Q.message}`).reduce((Q, Y) => Q + X + Y);
    }
    $dataMetaSchema($, X) {
      let J = this.RULES.all;
      $ = JSON.parse(JSON.stringify($));
      for (let Q of X) {
        let Y = Q.split("/").slice(1), W = $;
        for (let z of Y) W = W[z];
        for (let z in J) {
          let G = J[z];
          if (typeof G != "object") continue;
          let { $data: U } = G.definition, H = W[z];
          if (U && H) W[z] = Mq(H);
        }
      }
      return $;
    }
    _removeAllSchemas($, X) {
      for (let J in $) {
        let Q = $[J];
        if (!X || X.test(J)) {
          if (typeof Q == "string") delete $[J];
          else if (Q && !Q.meta) this._cache.delete(Q.schema), delete $[J];
        }
      }
    }
    _addSchema($, X, J, Q = this.opts.validateSchema, Y = this.opts.addUsedSchema) {
      let W, { schemaId: z } = this.opts;
      if (typeof $ == "object") W = $[z];
      else if (this.opts.jtd) throw Error("schema must be object");
      else if (typeof $ != "boolean") throw Error("schema must be object or boolean");
      let G = this._cache.get($);
      if (G !== void 0) return G;
      J = (0, o9.normalizeId)(W || J);
      let U = o9.getSchemaRefs.call(this, $, J);
      if (G = new r9.SchemaEnv({ schema: $, schemaId: z, meta: X, baseId: J, localRefs: U }), this._cache.set(G.schema, G), Y && !J.startsWith("#")) {
        if (J) this._checkUnique(J);
        this.refs[J] = G;
      }
      if (Q) this.validateSchema($, true);
      return G;
    }
    _checkUnique($) {
      if (this.schemas[$] || this.refs[$]) throw Error(`schema with key or id "${$}" already exists`);
    }
    _compileSchemaEnv($) {
      if ($.meta) this._compileMetaSchema($);
      else r9.compileSchema.call(this, $);
      if (!$.validate) throw Error("ajv implementation error");
      return $.validate;
    }
    _compileMetaSchema($) {
      let X = this.opts;
      this.opts = this._metaOpts;
      try {
        r9.compileSchema.call(this, $);
      } finally {
        this.opts = X;
      }
    }
  }
  X5.ValidationError = tC.default;
  X5.MissingRefError = jq.default;
  R4.default = X5;
  function Lq($, X, J, Q = "error") {
    for (let Y in $) {
      let W = Y;
      if (W in X) this.logger[Q](`${J}: option ${Y}. ${$[W]}`);
    }
  }
  function Dq($) {
    return $ = (0, o9.normalizeId)($), this.schemas[$] || this.refs[$];
  }
  function Wk() {
    let $ = this.opts.schemas;
    if (!$) return;
    if (Array.isArray($)) this.addSchema($);
    else for (let X in $) this.addSchema($[X], X);
  }
  function zk() {
    for (let $ in this.opts.formats) {
      let X = this.opts.formats[$];
      if (X) this.addFormat($, X);
    }
  }
  function Gk($) {
    if (Array.isArray($)) {
      this.addVocabulary($);
      return;
    }
    this.logger.warn("keywords option as map is deprecated, pass array");
    for (let X in $) {
      let J = $[X];
      if (!J.keyword) J.keyword = X;
      this.addKeyword(J);
    }
  }
  function Uk() {
    let $ = { ...this.opts };
    for (let X of $k) delete $[X];
    return $;
  }
  var Hk = { log() {
  }, warn() {
  }, error() {
  } };
  function Kk($) {
    if ($ === false) return Hk;
    if ($ === void 0) return console;
    if ($.log && $.warn && $.error) return $;
    throw Error("logger must implement log, warn and error methods");
  }
  var Vk = /^[a-z_$][a-z0-9_$:-]*$/i;
  function Nk($, X) {
    let { RULES: J } = this;
    if ((0, EU.eachItem)($, (Q) => {
      if (J.keywords[Q]) throw Error(`Keyword ${Q} is already defined`);
      if (!Vk.test(Q)) throw Error(`Keyword ${Q} has invalid name`);
    }), !X) return;
    if (X.$data && !("code" in X || "validate" in X)) throw Error('$data keyword must have "code" or "validate" function');
  }
  function RU($, X, J) {
    var Q;
    let Y = X === null || X === void 0 ? void 0 : X.post;
    if (J && Y) throw Error('keyword with "post" flag cannot have "type"');
    let { RULES: W } = this, z = Y ? W.post : W.rules.find(({ type: U }) => U === J);
    if (!z) z = { type: J, rules: [] }, W.rules.push(z);
    if (W.keywords[$] = true, !X) return;
    let G = { keyword: $, definition: { ...X, type: (0, $5.getJSONTypes)(X.type), schemaType: (0, $5.getJSONTypes)(X.schemaType) } };
    if (X.before) Ok.call(this, z, G, X.before);
    else z.rules.push(G);
    W.all[$] = G, (Q = X.implements) === null || Q === void 0 || Q.forEach((U) => this.addKeyword(U));
  }
  function Ok($, X, J) {
    let Q = $.rules.findIndex((Y) => Y.keyword === J);
    if (Q >= 0) $.rules.splice(Q, 0, X);
    else $.rules.push(X), this.logger.warn(`rule ${J} is not defined`);
  }
  function wk($) {
    let { metaSchema: X } = $;
    if (X === void 0) return;
    if ($.$data && this.opts.$data) X = Mq(X);
    $.validateSchema = this.compile(X, true);
  }
  var Bk = { $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#" };
  function Mq($) {
    return { anyOf: [$, Bk] };
  }
});
var bq = k((Iq) => {
  Object.defineProperty(Iq, "__esModule", { value: true });
  var Dk = { keyword: "id", code() {
    throw Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
  } };
  Iq.default = Dk;
});
var vq = k((Eq) => {
  Object.defineProperty(Eq, "__esModule", { value: true });
  Eq.callRef = Eq.getValidate = void 0;
  var Fk = d9(), Zq = E6(), V6 = a(), X8 = b4(), Pq = tQ(), J5 = Q$(), Mk = { keyword: "$ref", schemaType: "string", code($) {
    let { gen: X, schema: J, it: Q } = $, { baseId: Y, schemaEnv: W, validateName: z, opts: G, self: U } = Q, { root: H } = W;
    if ((J === "#" || J === "#/") && Y === H.baseId) return V();
    let K = Pq.resolveRef.call(U, H, Y, J);
    if (K === void 0) throw new Fk.default(Q.opts.uriResolver, Y, J);
    if (K instanceof Pq.SchemaEnv) return N(K);
    return O(K);
    function V() {
      if (W === H) return Y5($, z, W, W.$async);
      let w = X.scopeValue("root", { ref: H });
      return Y5($, V6._`${w}.validate`, H, H.$async);
    }
    function N(w) {
      let B = Rq($, w);
      Y5($, B, w, w.$async);
    }
    function O(w) {
      let B = X.scopeValue("schema", G.code.source === true ? { ref: w, code: (0, V6.stringify)(w) } : { ref: w }), D = X.name("valid"), j = $.subschema({ schema: w, dataTypes: [], schemaPath: V6.nil, topSchemaRef: B, errSchemaPath: J }, D);
      $.mergeEvaluated(j), $.ok(D);
    }
  } };
  function Rq($, X) {
    let { gen: J } = $;
    return X.validate ? J.scopeValue("validate", { ref: X.validate }) : V6._`${J.scopeValue("wrapper", { ref: X })}.validate`;
  }
  Eq.getValidate = Rq;
  function Y5($, X, J, Q) {
    let { gen: Y, it: W } = $, { allErrors: z, schemaEnv: G, opts: U } = W, H = U.passContext ? X8.default.this : V6.nil;
    if (Q) K();
    else V();
    function K() {
      if (!G.$async) throw Error("async schema referenced by sync schema");
      let w = Y.let("valid");
      Y.try(() => {
        if (Y.code(V6._`await ${(0, Zq.callValidateCode)($, X, H)}`), O(X), !z) Y.assign(w, true);
      }, (B) => {
        if (Y.if(V6._`!(${B} instanceof ${W.ValidationError})`, () => Y.throw(B)), N(B), !z) Y.assign(w, false);
      }), $.ok(w);
    }
    function V() {
      $.result((0, Zq.callValidateCode)($, X, H), () => O(X), () => N(X));
    }
    function N(w) {
      let B = V6._`${w}.errors`;
      Y.assign(X8.default.vErrors, V6._`${X8.default.vErrors} === null ? ${B} : ${X8.default.vErrors}.concat(${B})`), Y.assign(X8.default.errors, V6._`${X8.default.vErrors}.length`);
    }
    function O(w) {
      var B;
      if (!W.opts.unevaluated) return;
      let D = (B = J === null || J === void 0 ? void 0 : J.validate) === null || B === void 0 ? void 0 : B.evaluated;
      if (W.props !== true) if (D && !D.dynamicProps) {
        if (D.props !== void 0) W.props = J5.mergeEvaluated.props(Y, D.props, W.props);
      } else {
        let j = Y.var("props", V6._`${w}.evaluated.props`);
        W.props = J5.mergeEvaluated.props(Y, j, W.props, V6.Name);
      }
      if (W.items !== true) if (D && !D.dynamicItems) {
        if (D.items !== void 0) W.items = J5.mergeEvaluated.items(Y, D.items, W.items);
      } else {
        let j = Y.var("items", V6._`${w}.evaluated.items`);
        W.items = J5.mergeEvaluated.items(Y, j, W.items, V6.Name);
      }
    }
  }
  Eq.callRef = Y5;
  Eq.default = Mk;
});
var kq = k((Cq) => {
  Object.defineProperty(Cq, "__esModule", { value: true });
  var bk = bq(), Zk = vq(), Pk = ["$schema", "$id", "$defs", "$vocabulary", { keyword: "$comment" }, "definitions", bk.default, Zk.default];
  Cq.default = Pk;
});
var xq = k((_q) => {
  Object.defineProperty(_q, "__esModule", { value: true });
  var Q5 = a(), Q1 = Q5.operators, W5 = { maximum: { okStr: "<=", ok: Q1.LTE, fail: Q1.GT }, minimum: { okStr: ">=", ok: Q1.GTE, fail: Q1.LT }, exclusiveMaximum: { okStr: "<", ok: Q1.LT, fail: Q1.GTE }, exclusiveMinimum: { okStr: ">", ok: Q1.GT, fail: Q1.LTE } }, Ek = { message: ({ keyword: $, schemaCode: X }) => Q5.str`must be ${W5[$].okStr} ${X}`, params: ({ keyword: $, schemaCode: X }) => Q5._`{comparison: ${W5[$].okStr}, limit: ${X}}` }, Sk = { keyword: Object.keys(W5), type: "number", schemaType: "number", $data: true, error: Ek, code($) {
    let { keyword: X, data: J, schemaCode: Q } = $;
    $.fail$data(Q5._`${J} ${W5[X].fail} ${Q} || isNaN(${J})`);
  } };
  _q.default = Sk;
});
var yq = k((Tq) => {
  Object.defineProperty(Tq, "__esModule", { value: true });
  var t9 = a(), Ck = { message: ({ schemaCode: $ }) => t9.str`must be multiple of ${$}`, params: ({ schemaCode: $ }) => t9._`{multipleOf: ${$}}` }, kk = { keyword: "multipleOf", type: "number", schemaType: "number", $data: true, error: Ck, code($) {
    let { gen: X, data: J, schemaCode: Q, it: Y } = $, W = Y.opts.multipleOfPrecision, z = X.let("res"), G = W ? t9._`Math.abs(Math.round(${z}) - ${z}) > 1e-${W}` : t9._`${z} !== parseInt(${z})`;
    $.fail$data(t9._`(${Q} === 0 || (${z} = ${J}/${Q}, ${G}))`);
  } };
  Tq.default = kk;
});
var hq = k((gq) => {
  Object.defineProperty(gq, "__esModule", { value: true });
  function fq($) {
    let X = $.length, J = 0, Q = 0, Y;
    while (Q < X) if (J++, Y = $.charCodeAt(Q++), Y >= 55296 && Y <= 56319 && Q < X) {
      if (Y = $.charCodeAt(Q), (Y & 64512) === 56320) Q++;
    }
    return J;
  }
  gq.default = fq;
  fq.code = 'require("ajv/dist/runtime/ucs2length").default';
});
var mq = k((uq) => {
  Object.defineProperty(uq, "__esModule", { value: true });
  var u1 = a(), Tk = Q$(), yk = hq(), fk = { message({ keyword: $, schemaCode: X }) {
    let J = $ === "maxLength" ? "more" : "fewer";
    return u1.str`must NOT have ${J} than ${X} characters`;
  }, params: ({ schemaCode: $ }) => u1._`{limit: ${$}}` }, gk = { keyword: ["maxLength", "minLength"], type: "string", schemaType: "number", $data: true, error: fk, code($) {
    let { keyword: X, data: J, schemaCode: Q, it: Y } = $, W = X === "maxLength" ? u1.operators.GT : u1.operators.LT, z = Y.opts.unicode === false ? u1._`${J}.length` : u1._`${(0, Tk.useFunc)($.gen, yk.default)}(${J})`;
    $.fail$data(u1._`${z} ${W} ${Q}`);
  } };
  uq.default = gk;
});
var cq = k((lq) => {
  Object.defineProperty(lq, "__esModule", { value: true });
  var uk = E6(), mk = Q$(), J8 = a(), lk = { message: ({ schemaCode: $ }) => J8.str`must match pattern "${$}"`, params: ({ schemaCode: $ }) => J8._`{pattern: ${$}}` }, ck = { keyword: "pattern", type: "string", schemaType: "string", $data: true, error: lk, code($) {
    let { gen: X, data: J, $data: Q, schema: Y, schemaCode: W, it: z } = $, G = z.opts.unicodeRegExp ? "u" : "";
    if (Q) {
      let { regExp: U } = z.opts.code, H = U.code === "new RegExp" ? J8._`new RegExp` : (0, mk.useFunc)(X, U), K = X.let("valid");
      X.try(() => X.assign(K, J8._`${H}(${W}, ${G}).test(${J})`), () => X.assign(K, false)), $.fail$data(J8._`!${K}`);
    } else {
      let U = (0, uk.usePattern)($, Y);
      $.fail$data(J8._`!${U}.test(${J})`);
    }
  } };
  lq.default = ck;
});
var dq = k((pq) => {
  Object.defineProperty(pq, "__esModule", { value: true });
  var a9 = a(), dk = { message({ keyword: $, schemaCode: X }) {
    let J = $ === "maxProperties" ? "more" : "fewer";
    return a9.str`must NOT have ${J} than ${X} properties`;
  }, params: ({ schemaCode: $ }) => a9._`{limit: ${$}}` }, ik = { keyword: ["maxProperties", "minProperties"], type: "object", schemaType: "number", $data: true, error: dk, code($) {
    let { keyword: X, data: J, schemaCode: Q } = $, Y = X === "maxProperties" ? a9.operators.GT : a9.operators.LT;
    $.fail$data(a9._`Object.keys(${J}).length ${Y} ${Q}`);
  } };
  pq.default = ik;
});
var nq = k((iq) => {
  Object.defineProperty(iq, "__esModule", { value: true });
  var s9 = E6(), e9 = a(), rk = Q$(), ok = { message: ({ params: { missingProperty: $ } }) => e9.str`must have required property '${$}'`, params: ({ params: { missingProperty: $ } }) => e9._`{missingProperty: ${$}}` }, tk = { keyword: "required", type: "object", schemaType: "array", $data: true, error: ok, code($) {
    let { gen: X, schema: J, schemaCode: Q, data: Y, $data: W, it: z } = $, { opts: G } = z;
    if (!W && J.length === 0) return;
    let U = J.length >= G.loopRequired;
    if (z.allErrors) H();
    else K();
    if (G.strictRequired) {
      let O = $.parentSchema.properties, { definedProperties: w } = $.it;
      for (let B of J) if ((O === null || O === void 0 ? void 0 : O[B]) === void 0 && !w.has(B)) {
        let D = z.schemaEnv.baseId + z.errSchemaPath, j = `required property "${B}" is not defined at "${D}" (strictRequired)`;
        (0, rk.checkStrictMode)(z, j, z.opts.strictRequired);
      }
    }
    function H() {
      if (U || W) $.block$data(e9.nil, V);
      else for (let O of J) (0, s9.checkReportMissingProp)($, O);
    }
    function K() {
      let O = X.let("missing");
      if (U || W) {
        let w = X.let("valid", true);
        $.block$data(w, () => N(O, w)), $.ok(w);
      } else X.if((0, s9.checkMissingProp)($, J, O)), (0, s9.reportMissingProp)($, O), X.else();
    }
    function V() {
      X.forOf("prop", Q, (O) => {
        $.setParams({ missingProperty: O }), X.if((0, s9.noPropertyInData)(X, Y, O, G.ownProperties), () => $.error());
      });
    }
    function N(O, w) {
      $.setParams({ missingProperty: O }), X.forOf(O, Q, () => {
        X.assign(w, (0, s9.propertyInData)(X, Y, O, G.ownProperties)), X.if((0, e9.not)(w), () => {
          $.error(), X.break();
        });
      }, e9.nil);
    }
  } };
  iq.default = tk;
});
var oq = k((rq) => {
  Object.defineProperty(rq, "__esModule", { value: true });
  var $J = a(), sk = { message({ keyword: $, schemaCode: X }) {
    let J = $ === "maxItems" ? "more" : "fewer";
    return $J.str`must NOT have ${J} than ${X} items`;
  }, params: ({ schemaCode: $ }) => $J._`{limit: ${$}}` }, ek = { keyword: ["maxItems", "minItems"], type: "array", schemaType: "number", $data: true, error: sk, code($) {
    let { keyword: X, data: J, schemaCode: Q } = $, Y = X === "maxItems" ? $J.operators.GT : $J.operators.LT;
    $.fail$data($J._`${J}.length ${Y} ${Q}`);
  } };
  rq.default = ek;
});
var z5 = k((aq) => {
  Object.defineProperty(aq, "__esModule", { value: true });
  var tq = wU();
  tq.code = 'require("ajv/dist/runtime/equal").default';
  aq.default = tq;
});
var eq = k((sq) => {
  Object.defineProperty(sq, "__esModule", { value: true });
  var SU = u9(), m$ = a(), J_ = Q$(), Y_ = z5(), Q_ = { message: ({ params: { i: $, j: X } }) => m$.str`must NOT have duplicate items (items ## ${X} and ${$} are identical)`, params: ({ params: { i: $, j: X } }) => m$._`{i: ${$}, j: ${X}}` }, W_ = { keyword: "uniqueItems", type: "array", schemaType: "boolean", $data: true, error: Q_, code($) {
    let { gen: X, data: J, $data: Q, schema: Y, parentSchema: W, schemaCode: z, it: G } = $;
    if (!Q && !Y) return;
    let U = X.let("valid"), H = W.items ? (0, SU.getSchemaTypes)(W.items) : [];
    $.block$data(U, K, m$._`${z} === false`), $.ok(U);
    function K() {
      let w = X.let("i", m$._`${J}.length`), B = X.let("j");
      $.setParams({ i: w, j: B }), X.assign(U, true), X.if(m$._`${w} > 1`, () => (V() ? N : O)(w, B));
    }
    function V() {
      return H.length > 0 && !H.some((w) => w === "object" || w === "array");
    }
    function N(w, B) {
      let D = X.name("item"), j = (0, SU.checkDataTypes)(H, D, G.opts.strictNumbers, SU.DataType.Wrong), A = X.const("indices", m$._`{}`);
      X.for(m$._`;${w}--;`, () => {
        if (X.let(D, m$._`${J}[${w}]`), X.if(j, m$._`continue`), H.length > 1) X.if(m$._`typeof ${D} == "string"`, m$._`${D} += "_"`);
        X.if(m$._`typeof ${A}[${D}] == "number"`, () => {
          X.assign(B, m$._`${A}[${D}]`), $.error(), X.assign(U, false).break();
        }).code(m$._`${A}[${D}] = ${w}`);
      });
    }
    function O(w, B) {
      let D = (0, J_.useFunc)(X, Y_.default), j = X.name("outer");
      X.label(j).for(m$._`;${w}--;`, () => X.for(m$._`${B} = ${w}; ${B}--;`, () => X.if(m$._`${D}(${J}[${w}], ${J}[${B}])`, () => {
        $.error(), X.assign(U, false).break(j);
      })));
    }
  } };
  sq.default = W_;
});
var XL = k(($L) => {
  Object.defineProperty($L, "__esModule", { value: true });
  var vU = a(), G_ = Q$(), U_ = z5(), H_ = { message: "must be equal to constant", params: ({ schemaCode: $ }) => vU._`{allowedValue: ${$}}` }, K_ = { keyword: "const", $data: true, error: H_, code($) {
    let { gen: X, data: J, $data: Q, schemaCode: Y, schema: W } = $;
    if (Q || W && typeof W == "object") $.fail$data(vU._`!${(0, G_.useFunc)(X, U_.default)}(${J}, ${Y})`);
    else $.fail(vU._`${W} !== ${J}`);
  } };
  $L.default = K_;
});
var YL = k((JL) => {
  Object.defineProperty(JL, "__esModule", { value: true });
  var XJ = a(), N_ = Q$(), O_ = z5(), w_ = { message: "must be equal to one of the allowed values", params: ({ schemaCode: $ }) => XJ._`{allowedValues: ${$}}` }, B_ = { keyword: "enum", schemaType: "array", $data: true, error: w_, code($) {
    let { gen: X, data: J, $data: Q, schema: Y, schemaCode: W, it: z } = $;
    if (!Q && Y.length === 0) throw Error("enum must have non-empty array");
    let G = Y.length >= z.opts.loopEnum, U, H = () => U !== null && U !== void 0 ? U : U = (0, N_.useFunc)(X, O_.default), K;
    if (G || Q) K = X.let("valid"), $.block$data(K, V);
    else {
      if (!Array.isArray(Y)) throw Error("ajv implementation error");
      let O = X.const("vSchema", W);
      K = (0, XJ.or)(...Y.map((w, B) => N(O, B)));
    }
    $.pass(K);
    function V() {
      X.assign(K, false), X.forOf("v", W, (O) => X.if(XJ._`${H()}(${J}, ${O})`, () => X.assign(K, true).break()));
    }
    function N(O, w) {
      let B = Y[w];
      return typeof B === "object" && B !== null ? XJ._`${H()}(${J}, ${O}[${w}])` : XJ._`${J} === ${B}`;
    }
  } };
  JL.default = B_;
});
var WL = k((QL) => {
  Object.defineProperty(QL, "__esModule", { value: true });
  var L_ = xq(), D_ = yq(), j_ = mq(), F_ = cq(), M_ = dq(), A_ = nq(), I_ = oq(), b_ = eq(), Z_ = XL(), P_ = YL(), R_ = [L_.default, D_.default, j_.default, F_.default, M_.default, A_.default, I_.default, b_.default, { keyword: "type", schemaType: ["string", "array"] }, { keyword: "nullable", schemaType: "boolean" }, Z_.default, P_.default];
  QL.default = R_;
});
var kU = k((GL) => {
  Object.defineProperty(GL, "__esModule", { value: true });
  GL.validateAdditionalItems = void 0;
  var m1 = a(), CU = Q$(), S_ = { message: ({ params: { len: $ } }) => m1.str`must NOT have more than ${$} items`, params: ({ params: { len: $ } }) => m1._`{limit: ${$}}` }, v_ = { keyword: "additionalItems", type: "array", schemaType: ["boolean", "object"], before: "uniqueItems", error: S_, code($) {
    let { parentSchema: X, it: J } = $, { items: Q } = X;
    if (!Array.isArray(Q)) {
      (0, CU.checkStrictMode)(J, '"additionalItems" is ignored when "items" is not an array of schemas');
      return;
    }
    zL($, Q);
  } };
  function zL($, X) {
    let { gen: J, schema: Q, data: Y, keyword: W, it: z } = $;
    z.items = true;
    let G = J.const("len", m1._`${Y}.length`);
    if (Q === false) $.setParams({ len: X.length }), $.pass(m1._`${G} <= ${X.length}`);
    else if (typeof Q == "object" && !(0, CU.alwaysValidSchema)(z, Q)) {
      let H = J.var("valid", m1._`${G} <= ${X.length}`);
      J.if((0, m1.not)(H), () => U(H)), $.ok(H);
    }
    function U(H) {
      J.forRange("i", X.length, G, (K) => {
        if ($.subschema({ keyword: W, dataProp: K, dataPropType: CU.Type.Num }, H), !z.allErrors) J.if((0, m1.not)(H), () => J.break());
      });
    }
  }
  GL.validateAdditionalItems = zL;
  GL.default = v_;
});
var _U = k((VL) => {
  Object.defineProperty(VL, "__esModule", { value: true });
  VL.validateTuple = void 0;
  var HL = a(), G5 = Q$(), k_ = E6(), __ = { keyword: "items", type: "array", schemaType: ["object", "array", "boolean"], before: "uniqueItems", code($) {
    let { schema: X, it: J } = $;
    if (Array.isArray(X)) return KL($, "additionalItems", X);
    if (J.items = true, (0, G5.alwaysValidSchema)(J, X)) return;
    $.ok((0, k_.validateArray)($));
  } };
  function KL($, X, J = $.schema) {
    let { gen: Q, parentSchema: Y, data: W, keyword: z, it: G } = $;
    if (K(Y), G.opts.unevaluated && J.length && G.items !== true) G.items = G5.mergeEvaluated.items(Q, J.length, G.items);
    let U = Q.name("valid"), H = Q.const("len", HL._`${W}.length`);
    J.forEach((V, N) => {
      if ((0, G5.alwaysValidSchema)(G, V)) return;
      Q.if(HL._`${H} > ${N}`, () => $.subschema({ keyword: z, schemaProp: N, dataProp: N }, U)), $.ok(U);
    });
    function K(V) {
      let { opts: N, errSchemaPath: O } = G, w = J.length, B = w === V.minItems && (w === V.maxItems || V[X] === false);
      if (N.strictTuples && !B) {
        let D = `"${z}" is ${w}-tuple, but minItems or maxItems/${X} are not specified or different at path "${O}"`;
        (0, G5.checkStrictMode)(G, D, N.strictTuples);
      }
    }
  }
  VL.validateTuple = KL;
  VL.default = __;
});
var wL = k((OL) => {
  Object.defineProperty(OL, "__esModule", { value: true });
  var T_ = _U(), y_ = { keyword: "prefixItems", type: "array", schemaType: ["array"], before: "uniqueItems", code: ($) => (0, T_.validateTuple)($, "items") };
  OL.default = y_;
});
var LL = k((qL) => {
  Object.defineProperty(qL, "__esModule", { value: true });
  var BL = a(), g_ = Q$(), h_ = E6(), u_ = kU(), m_ = { message: ({ params: { len: $ } }) => BL.str`must NOT have more than ${$} items`, params: ({ params: { len: $ } }) => BL._`{limit: ${$}}` }, l_ = { keyword: "items", type: "array", schemaType: ["object", "boolean"], before: "uniqueItems", error: m_, code($) {
    let { schema: X, parentSchema: J, it: Q } = $, { prefixItems: Y } = J;
    if (Q.items = true, (0, g_.alwaysValidSchema)(Q, X)) return;
    if (Y) (0, u_.validateAdditionalItems)($, Y);
    else $.ok((0, h_.validateArray)($));
  } };
  qL.default = l_;
});
var jL = k((DL) => {
  Object.defineProperty(DL, "__esModule", { value: true });
  var S6 = a(), U5 = Q$(), p_ = { message: ({ params: { min: $, max: X } }) => X === void 0 ? S6.str`must contain at least ${$} valid item(s)` : S6.str`must contain at least ${$} and no more than ${X} valid item(s)`, params: ({ params: { min: $, max: X } }) => X === void 0 ? S6._`{minContains: ${$}}` : S6._`{minContains: ${$}, maxContains: ${X}}` }, d_ = { keyword: "contains", type: "array", schemaType: ["object", "boolean"], before: "uniqueItems", trackErrors: true, error: p_, code($) {
    let { gen: X, schema: J, parentSchema: Q, data: Y, it: W } = $, z, G, { minContains: U, maxContains: H } = Q;
    if (W.opts.next) z = U === void 0 ? 1 : U, G = H;
    else z = 1;
    let K = X.const("len", S6._`${Y}.length`);
    if ($.setParams({ min: z, max: G }), G === void 0 && z === 0) {
      (0, U5.checkStrictMode)(W, '"minContains" == 0 without "maxContains": "contains" keyword ignored');
      return;
    }
    if (G !== void 0 && z > G) {
      (0, U5.checkStrictMode)(W, '"minContains" > "maxContains" is always invalid'), $.fail();
      return;
    }
    if ((0, U5.alwaysValidSchema)(W, J)) {
      let B = S6._`${K} >= ${z}`;
      if (G !== void 0) B = S6._`${B} && ${K} <= ${G}`;
      $.pass(B);
      return;
    }
    W.items = true;
    let V = X.name("valid");
    if (G === void 0 && z === 1) O(V, () => X.if(V, () => X.break()));
    else if (z === 0) {
      if (X.let(V, true), G !== void 0) X.if(S6._`${Y}.length > 0`, N);
    } else X.let(V, false), N();
    $.result(V, () => $.reset());
    function N() {
      let B = X.name("_valid"), D = X.let("count", 0);
      O(B, () => X.if(B, () => w(D)));
    }
    function O(B, D) {
      X.forRange("i", 0, K, (j) => {
        $.subschema({ keyword: "contains", dataProp: j, dataPropType: U5.Type.Num, compositeRule: true }, B), D();
      });
    }
    function w(B) {
      if (X.code(S6._`${B}++`), G === void 0) X.if(S6._`${B} >= ${z}`, () => X.assign(V, true).break());
      else if (X.if(S6._`${B} > ${G}`, () => X.assign(V, false).break()), z === 1) X.assign(V, true);
      else X.if(S6._`${B} >= ${z}`, () => X.assign(V, true));
    }
  } };
  DL.default = d_;
});
var ZL = k((AL) => {
  Object.defineProperty(AL, "__esModule", { value: true });
  AL.validateSchemaDeps = AL.validatePropertyDeps = AL.error = void 0;
  var xU = a(), n_ = Q$(), JJ = E6();
  AL.error = { message: ({ params: { property: $, depsCount: X, deps: J } }) => {
    let Q = X === 1 ? "property" : "properties";
    return xU.str`must have ${Q} ${J} when property ${$} is present`;
  }, params: ({ params: { property: $, depsCount: X, deps: J, missingProperty: Q } }) => xU._`{property: ${$},
    missingProperty: ${Q},
    depsCount: ${X},
    deps: ${J}}` };
  var r_ = { keyword: "dependencies", type: "object", schemaType: "object", error: AL.error, code($) {
    let [X, J] = o_($);
    FL($, X), ML($, J);
  } };
  function o_({ schema: $ }) {
    let X = {}, J = {};
    for (let Q in $) {
      if (Q === "__proto__") continue;
      let Y = Array.isArray($[Q]) ? X : J;
      Y[Q] = $[Q];
    }
    return [X, J];
  }
  function FL($, X = $.schema) {
    let { gen: J, data: Q, it: Y } = $;
    if (Object.keys(X).length === 0) return;
    let W = J.let("missing");
    for (let z in X) {
      let G = X[z];
      if (G.length === 0) continue;
      let U = (0, JJ.propertyInData)(J, Q, z, Y.opts.ownProperties);
      if ($.setParams({ property: z, depsCount: G.length, deps: G.join(", ") }), Y.allErrors) J.if(U, () => {
        for (let H of G) (0, JJ.checkReportMissingProp)($, H);
      });
      else J.if(xU._`${U} && (${(0, JJ.checkMissingProp)($, G, W)})`), (0, JJ.reportMissingProp)($, W), J.else();
    }
  }
  AL.validatePropertyDeps = FL;
  function ML($, X = $.schema) {
    let { gen: J, data: Q, keyword: Y, it: W } = $, z = J.name("valid");
    for (let G in X) {
      if ((0, n_.alwaysValidSchema)(W, X[G])) continue;
      J.if((0, JJ.propertyInData)(J, Q, G, W.opts.ownProperties), () => {
        let U = $.subschema({ keyword: Y, schemaProp: G }, z);
        $.mergeValidEvaluated(U, z);
      }, () => J.var(z, true)), $.ok(z);
    }
  }
  AL.validateSchemaDeps = ML;
  AL.default = r_;
});
var EL = k((RL) => {
  Object.defineProperty(RL, "__esModule", { value: true });
  var PL = a(), s_ = Q$(), e_ = { message: "property name must be valid", params: ({ params: $ }) => PL._`{propertyName: ${$.propertyName}}` }, $x = { keyword: "propertyNames", type: "object", schemaType: ["object", "boolean"], error: e_, code($) {
    let { gen: X, schema: J, data: Q, it: Y } = $;
    if ((0, s_.alwaysValidSchema)(Y, J)) return;
    let W = X.name("valid");
    X.forIn("key", Q, (z) => {
      $.setParams({ propertyName: z }), $.subschema({ keyword: "propertyNames", data: z, dataTypes: ["string"], propertyName: z, compositeRule: true }, W), X.if((0, PL.not)(W), () => {
        if ($.error(true), !Y.allErrors) X.break();
      });
    }), $.ok(W);
  } };
  RL.default = $x;
});
var TU = k((SL) => {
  Object.defineProperty(SL, "__esModule", { value: true });
  var H5 = E6(), p6 = a(), Jx = b4(), K5 = Q$(), Yx = { message: "must NOT have additional properties", params: ({ params: $ }) => p6._`{additionalProperty: ${$.additionalProperty}}` }, Qx = { keyword: "additionalProperties", type: ["object"], schemaType: ["boolean", "object"], allowUndefined: true, trackErrors: true, error: Yx, code($) {
    let { gen: X, schema: J, parentSchema: Q, data: Y, errsCount: W, it: z } = $;
    if (!W) throw Error("ajv implementation error");
    let { allErrors: G, opts: U } = z;
    if (z.props = true, U.removeAdditional !== "all" && (0, K5.alwaysValidSchema)(z, J)) return;
    let H = (0, H5.allSchemaProperties)(Q.properties), K = (0, H5.allSchemaProperties)(Q.patternProperties);
    V(), $.ok(p6._`${W} === ${Jx.default.errors}`);
    function V() {
      X.forIn("key", Y, (D) => {
        if (!H.length && !K.length) w(D);
        else X.if(N(D), () => w(D));
      });
    }
    function N(D) {
      let j;
      if (H.length > 8) {
        let A = (0, K5.schemaRefOrVal)(z, Q.properties, "properties");
        j = (0, H5.isOwnProperty)(X, A, D);
      } else if (H.length) j = (0, p6.or)(...H.map((A) => p6._`${D} === ${A}`));
      else j = p6.nil;
      if (K.length) j = (0, p6.or)(j, ...K.map((A) => p6._`${(0, H5.usePattern)($, A)}.test(${D})`));
      return (0, p6.not)(j);
    }
    function O(D) {
      X.code(p6._`delete ${Y}[${D}]`);
    }
    function w(D) {
      if (U.removeAdditional === "all" || U.removeAdditional && J === false) {
        O(D);
        return;
      }
      if (J === false) {
        if ($.setParams({ additionalProperty: D }), $.error(), !G) X.break();
        return;
      }
      if (typeof J == "object" && !(0, K5.alwaysValidSchema)(z, J)) {
        let j = X.name("valid");
        if (U.removeAdditional === "failing") B(D, j, false), X.if((0, p6.not)(j), () => {
          $.reset(), O(D);
        });
        else if (B(D, j), !G) X.if((0, p6.not)(j), () => X.break());
      }
    }
    function B(D, j, A) {
      let I = { keyword: "additionalProperties", dataProp: D, dataPropType: K5.Type.Str };
      if (A === false) Object.assign(I, { compositeRule: true, createErrors: false, allErrors: false });
      $.subschema(I, j);
    }
  } };
  SL.default = Qx;
});
var _L = k((kL) => {
  Object.defineProperty(kL, "__esModule", { value: true });
  var zx = p9(), vL = E6(), yU = Q$(), CL = TU(), Gx = { keyword: "properties", type: "object", schemaType: "object", code($) {
    let { gen: X, schema: J, parentSchema: Q, data: Y, it: W } = $;
    if (W.opts.removeAdditional === "all" && Q.additionalProperties === void 0) CL.default.code(new zx.KeywordCxt(W, CL.default, "additionalProperties"));
    let z = (0, vL.allSchemaProperties)(J);
    for (let V of z) W.definedProperties.add(V);
    if (W.opts.unevaluated && z.length && W.props !== true) W.props = yU.mergeEvaluated.props(X, (0, yU.toHash)(z), W.props);
    let G = z.filter((V) => !(0, yU.alwaysValidSchema)(W, J[V]));
    if (G.length === 0) return;
    let U = X.name("valid");
    for (let V of G) {
      if (H(V)) K(V);
      else {
        if (X.if((0, vL.propertyInData)(X, Y, V, W.opts.ownProperties)), K(V), !W.allErrors) X.else().var(U, true);
        X.endIf();
      }
      $.it.definedProperties.add(V), $.ok(U);
    }
    function H(V) {
      return W.opts.useDefaults && !W.compositeRule && J[V].default !== void 0;
    }
    function K(V) {
      $.subschema({ keyword: "properties", schemaProp: V, dataProp: V }, U);
    }
  } };
  kL.default = Gx;
});
var gL = k((fL) => {
  Object.defineProperty(fL, "__esModule", { value: true });
  var xL = E6(), V5 = a(), TL = Q$(), yL = Q$(), Hx = { keyword: "patternProperties", type: "object", schemaType: "object", code($) {
    let { gen: X, schema: J, data: Q, parentSchema: Y, it: W } = $, { opts: z } = W, G = (0, xL.allSchemaProperties)(J), U = G.filter((B) => (0, TL.alwaysValidSchema)(W, J[B]));
    if (G.length === 0 || U.length === G.length && (!W.opts.unevaluated || W.props === true)) return;
    let H = z.strictSchema && !z.allowMatchingProperties && Y.properties, K = X.name("valid");
    if (W.props !== true && !(W.props instanceof V5.Name)) W.props = (0, yL.evaluatedPropsToName)(X, W.props);
    let { props: V } = W;
    N();
    function N() {
      for (let B of G) {
        if (H) O(B);
        if (W.allErrors) w(B);
        else X.var(K, true), w(B), X.if(K);
      }
    }
    function O(B) {
      for (let D in H) if (new RegExp(B).test(D)) (0, TL.checkStrictMode)(W, `property ${D} matches pattern ${B} (use allowMatchingProperties)`);
    }
    function w(B) {
      X.forIn("key", Q, (D) => {
        X.if(V5._`${(0, xL.usePattern)($, B)}.test(${D})`, () => {
          let j = U.includes(B);
          if (!j) $.subschema({ keyword: "patternProperties", schemaProp: B, dataProp: D, dataPropType: yL.Type.Str }, K);
          if (W.opts.unevaluated && V !== true) X.assign(V5._`${V}[${D}]`, true);
          else if (!j && !W.allErrors) X.if((0, V5.not)(K), () => X.break());
        });
      });
    }
  } };
  fL.default = Hx;
});
var uL = k((hL) => {
  Object.defineProperty(hL, "__esModule", { value: true });
  var Vx = Q$(), Nx = { keyword: "not", schemaType: ["object", "boolean"], trackErrors: true, code($) {
    let { gen: X, schema: J, it: Q } = $;
    if ((0, Vx.alwaysValidSchema)(Q, J)) {
      $.fail();
      return;
    }
    let Y = X.name("valid");
    $.subschema({ keyword: "not", compositeRule: true, createErrors: false, allErrors: false }, Y), $.failResult(Y, () => $.reset(), () => $.error());
  }, error: { message: "must NOT be valid" } };
  hL.default = Nx;
});
var lL = k((mL) => {
  Object.defineProperty(mL, "__esModule", { value: true });
  var wx = E6(), Bx = { keyword: "anyOf", schemaType: "array", trackErrors: true, code: wx.validateUnion, error: { message: "must match a schema in anyOf" } };
  mL.default = Bx;
});
var pL = k((cL) => {
  Object.defineProperty(cL, "__esModule", { value: true });
  var N5 = a(), Lx = Q$(), Dx = { message: "must match exactly one schema in oneOf", params: ({ params: $ }) => N5._`{passingSchemas: ${$.passing}}` }, jx = { keyword: "oneOf", schemaType: "array", trackErrors: true, error: Dx, code($) {
    let { gen: X, schema: J, parentSchema: Q, it: Y } = $;
    if (!Array.isArray(J)) throw Error("ajv implementation error");
    if (Y.opts.discriminator && Q.discriminator) return;
    let W = J, z = X.let("valid", false), G = X.let("passing", null), U = X.name("_valid");
    $.setParams({ passing: G }), X.block(H), $.result(z, () => $.reset(), () => $.error(true));
    function H() {
      W.forEach((K, V) => {
        let N;
        if ((0, Lx.alwaysValidSchema)(Y, K)) X.var(U, true);
        else N = $.subschema({ keyword: "oneOf", schemaProp: V, compositeRule: true }, U);
        if (V > 0) X.if(N5._`${U} && ${z}`).assign(z, false).assign(G, N5._`[${G}, ${V}]`).else();
        X.if(U, () => {
          if (X.assign(z, true), X.assign(G, V), N) $.mergeEvaluated(N, N5.Name);
        });
      });
    }
  } };
  cL.default = jx;
});
var iL = k((dL) => {
  Object.defineProperty(dL, "__esModule", { value: true });
  var Mx = Q$(), Ax = { keyword: "allOf", schemaType: "array", code($) {
    let { gen: X, schema: J, it: Q } = $;
    if (!Array.isArray(J)) throw Error("ajv implementation error");
    let Y = X.name("valid");
    J.forEach((W, z) => {
      if ((0, Mx.alwaysValidSchema)(Q, W)) return;
      let G = $.subschema({ keyword: "allOf", schemaProp: z }, Y);
      $.ok(Y), $.mergeEvaluated(G);
    });
  } };
  dL.default = Ax;
});
var tL = k((oL) => {
  Object.defineProperty(oL, "__esModule", { value: true });
  var O5 = a(), rL = Q$(), bx = { message: ({ params: $ }) => O5.str`must match "${$.ifClause}" schema`, params: ({ params: $ }) => O5._`{failingKeyword: ${$.ifClause}}` }, Zx = { keyword: "if", schemaType: ["object", "boolean"], trackErrors: true, error: bx, code($) {
    let { gen: X, parentSchema: J, it: Q } = $;
    if (J.then === void 0 && J.else === void 0) (0, rL.checkStrictMode)(Q, '"if" without "then" and "else" is ignored');
    let Y = nL(Q, "then"), W = nL(Q, "else");
    if (!Y && !W) return;
    let z = X.let("valid", true), G = X.name("_valid");
    if (U(), $.reset(), Y && W) {
      let K = X.let("ifClause");
      $.setParams({ ifClause: K }), X.if(G, H("then", K), H("else", K));
    } else if (Y) X.if(G, H("then"));
    else X.if((0, O5.not)(G), H("else"));
    $.pass(z, () => $.error(true));
    function U() {
      let K = $.subschema({ keyword: "if", compositeRule: true, createErrors: false, allErrors: false }, G);
      $.mergeEvaluated(K);
    }
    function H(K, V) {
      return () => {
        let N = $.subschema({ keyword: K }, G);
        if (X.assign(z, G), $.mergeValidEvaluated(N, z), V) X.assign(V, O5._`${K}`);
        else $.setParams({ ifClause: K });
      };
    }
  } };
  function nL($, X) {
    let J = $.schema[X];
    return J !== void 0 && !(0, rL.alwaysValidSchema)($, J);
  }
  oL.default = Zx;
});
var sL = k((aL) => {
  Object.defineProperty(aL, "__esModule", { value: true });
  var Rx = Q$(), Ex = { keyword: ["then", "else"], schemaType: ["object", "boolean"], code({ keyword: $, parentSchema: X, it: J }) {
    if (X.if === void 0) (0, Rx.checkStrictMode)(J, `"${$}" without "if" is ignored`);
  } };
  aL.default = Ex;
});
var $D = k((eL) => {
  Object.defineProperty(eL, "__esModule", { value: true });
  var vx = kU(), Cx = wL(), kx = _U(), _x = LL(), xx = jL(), Tx = ZL(), yx = EL(), fx = TU(), gx = _L(), hx = gL(), ux = uL(), mx = lL(), lx = pL(), cx = iL(), px = tL(), dx = sL();
  function ix($ = false) {
    let X = [ux.default, mx.default, lx.default, cx.default, px.default, dx.default, yx.default, fx.default, Tx.default, gx.default, hx.default];
    if ($) X.push(Cx.default, _x.default);
    else X.push(vx.default, kx.default);
    return X.push(xx.default), X;
  }
  eL.default = ix;
});
var JD = k((XD) => {
  Object.defineProperty(XD, "__esModule", { value: true });
  var S$ = a(), rx = { message: ({ schemaCode: $ }) => S$.str`must match format "${$}"`, params: ({ schemaCode: $ }) => S$._`{format: ${$}}` }, ox = { keyword: "format", type: ["number", "string"], schemaType: "string", $data: true, error: rx, code($, X) {
    let { gen: J, data: Q, $data: Y, schema: W, schemaCode: z, it: G } = $, { opts: U, errSchemaPath: H, schemaEnv: K, self: V } = G;
    if (!U.validateFormats) return;
    if (Y) N();
    else O();
    function N() {
      let w = J.scopeValue("formats", { ref: V.formats, code: U.code.formats }), B = J.const("fDef", S$._`${w}[${z}]`), D = J.let("fType"), j = J.let("format");
      J.if(S$._`typeof ${B} == "object" && !(${B} instanceof RegExp)`, () => J.assign(D, S$._`${B}.type || "string"`).assign(j, S$._`${B}.validate`), () => J.assign(D, S$._`"string"`).assign(j, B)), $.fail$data((0, S$.or)(A(), I()));
      function A() {
        if (U.strictSchema === false) return S$.nil;
        return S$._`${z} && !${j}`;
      }
      function I() {
        let x = K.$async ? S$._`(${B}.async ? await ${j}(${Q}) : ${j}(${Q}))` : S$._`${j}(${Q})`, T = S$._`(typeof ${j} == "function" ? ${x} : ${j}.test(${Q}))`;
        return S$._`${j} && ${j} !== true && ${D} === ${X} && !${T}`;
      }
    }
    function O() {
      let w = V.formats[W];
      if (!w) {
        A();
        return;
      }
      if (w === true) return;
      let [B, D, j] = I(w);
      if (B === X) $.pass(x());
      function A() {
        if (U.strictSchema === false) {
          V.logger.warn(T());
          return;
        }
        throw Error(T());
        function T() {
          return `unknown format "${W}" ignored in schema at path "${H}"`;
        }
      }
      function I(T) {
        let U$ = T instanceof RegExp ? (0, S$.regexpCode)(T) : U.code.formats ? S$._`${U.code.formats}${(0, S$.getProperty)(W)}` : void 0, T$ = J.scopeValue("formats", { key: W, ref: T, code: U$ });
        if (typeof T == "object" && !(T instanceof RegExp)) return [T.type || "string", T.validate, S$._`${T$}.validate`];
        return ["string", T, T$];
      }
      function x() {
        if (typeof w == "object" && !(w instanceof RegExp) && w.async) {
          if (!K.$async) throw Error("async format in sync schema");
          return S$._`await ${j}(${Q})`;
        }
        return typeof D == "function" ? S$._`${j}(${Q})` : S$._`${j}.test(${Q})`;
      }
    }
  } };
  XD.default = ox;
});
var QD = k((YD) => {
  Object.defineProperty(YD, "__esModule", { value: true });
  var ax = JD(), sx = [ax.default];
  YD.default = sx;
});
var GD = k((WD) => {
  Object.defineProperty(WD, "__esModule", { value: true });
  WD.contentVocabulary = WD.metadataVocabulary = void 0;
  WD.metadataVocabulary = ["title", "description", "default", "deprecated", "readOnly", "writeOnly", "examples"];
  WD.contentVocabulary = ["contentMediaType", "contentEncoding", "contentSchema"];
});
var KD = k((HD) => {
  Object.defineProperty(HD, "__esModule", { value: true });
  var XT = kq(), JT = WL(), YT = $D(), QT = QD(), UD = GD(), WT = [XT.default, JT.default, (0, YT.default)(), QT.default, UD.metadataVocabulary, UD.contentVocabulary];
  HD.default = WT;
});
var wD = k((ND) => {
  Object.defineProperty(ND, "__esModule", { value: true });
  ND.DiscrError = void 0;
  var VD;
  (function($) {
    $.Tag = "tag", $.Mapping = "mapping";
  })(VD || (ND.DiscrError = VD = {}));
});
var LD = k((qD) => {
  Object.defineProperty(qD, "__esModule", { value: true });
  var Y8 = a(), fU = wD(), BD = tQ(), GT = d9(), UT = Q$(), HT = { message: ({ params: { discrError: $, tagName: X } }) => $ === fU.DiscrError.Tag ? `tag "${X}" must be string` : `value of tag "${X}" must be in oneOf`, params: ({ params: { discrError: $, tag: X, tagName: J } }) => Y8._`{error: ${$}, tag: ${J}, tagValue: ${X}}` }, KT = { keyword: "discriminator", type: "object", schemaType: "object", error: HT, code($) {
    let { gen: X, data: J, schema: Q, parentSchema: Y, it: W } = $, { oneOf: z } = Y;
    if (!W.opts.discriminator) throw Error("discriminator: requires discriminator option");
    let G = Q.propertyName;
    if (typeof G != "string") throw Error("discriminator: requires propertyName");
    if (Q.mapping) throw Error("discriminator: mapping is not supported");
    if (!z) throw Error("discriminator: requires oneOf keyword");
    let U = X.let("valid", false), H = X.const("tag", Y8._`${J}${(0, Y8.getProperty)(G)}`);
    X.if(Y8._`typeof ${H} == "string"`, () => K(), () => $.error(false, { discrError: fU.DiscrError.Tag, tag: H, tagName: G })), $.ok(U);
    function K() {
      let O = N();
      X.if(false);
      for (let w in O) X.elseIf(Y8._`${H} === ${w}`), X.assign(U, V(O[w]));
      X.else(), $.error(false, { discrError: fU.DiscrError.Mapping, tag: H, tagName: G }), X.endIf();
    }
    function V(O) {
      let w = X.name("valid"), B = $.subschema({ keyword: "oneOf", schemaProp: O }, w);
      return $.mergeEvaluated(B, Y8.Name), w;
    }
    function N() {
      var O;
      let w = {}, B = j(Y), D = true;
      for (let x = 0; x < z.length; x++) {
        let T = z[x];
        if ((T === null || T === void 0 ? void 0 : T.$ref) && !(0, UT.schemaHasRulesButRef)(T, W.self.RULES)) {
          let T$ = T.$ref;
          if (T = BD.resolveRef.call(W.self, W.schemaEnv.root, W.baseId, T$), T instanceof BD.SchemaEnv) T = T.schema;
          if (T === void 0) throw new GT.default(W.opts.uriResolver, W.baseId, T$);
        }
        let U$ = (O = T === null || T === void 0 ? void 0 : T.properties) === null || O === void 0 ? void 0 : O[G];
        if (typeof U$ != "object") throw Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${G}"`);
        D = D && (B || j(T)), A(U$, x);
      }
      if (!D) throw Error(`discriminator: "${G}" must be required`);
      return w;
      function j({ required: x }) {
        return Array.isArray(x) && x.includes(G);
      }
      function A(x, T) {
        if (x.const) I(x.const, T);
        else if (x.enum) for (let U$ of x.enum) I(U$, T);
        else throw Error(`discriminator: "properties/${G}" must have "const" or "enum"`);
      }
      function I(x, T) {
        if (typeof x != "string" || x in w) throw Error(`discriminator: "${G}" values must be unique strings`);
        w[x] = T;
      }
    }
  } };
  qD.default = KT;
});
var DD = k((We, NT) => {
  NT.exports = { $schema: "http://json-schema.org/draft-07/schema#", $id: "http://json-schema.org/draft-07/schema#", title: "Core schema meta-schema", definitions: { schemaArray: { type: "array", minItems: 1, items: { $ref: "#" } }, nonNegativeInteger: { type: "integer", minimum: 0 }, nonNegativeIntegerDefault0: { allOf: [{ $ref: "#/definitions/nonNegativeInteger" }, { default: 0 }] }, simpleTypes: { enum: ["array", "boolean", "integer", "null", "number", "object", "string"] }, stringArray: { type: "array", items: { type: "string" }, uniqueItems: true, default: [] } }, type: ["object", "boolean"], properties: { $id: { type: "string", format: "uri-reference" }, $schema: { type: "string", format: "uri" }, $ref: { type: "string", format: "uri-reference" }, $comment: { type: "string" }, title: { type: "string" }, description: { type: "string" }, default: true, readOnly: { type: "boolean", default: false }, examples: { type: "array", items: true }, multipleOf: { type: "number", exclusiveMinimum: 0 }, maximum: { type: "number" }, exclusiveMaximum: { type: "number" }, minimum: { type: "number" }, exclusiveMinimum: { type: "number" }, maxLength: { $ref: "#/definitions/nonNegativeInteger" }, minLength: { $ref: "#/definitions/nonNegativeIntegerDefault0" }, pattern: { type: "string", format: "regex" }, additionalItems: { $ref: "#" }, items: { anyOf: [{ $ref: "#" }, { $ref: "#/definitions/schemaArray" }], default: true }, maxItems: { $ref: "#/definitions/nonNegativeInteger" }, minItems: { $ref: "#/definitions/nonNegativeIntegerDefault0" }, uniqueItems: { type: "boolean", default: false }, contains: { $ref: "#" }, maxProperties: { $ref: "#/definitions/nonNegativeInteger" }, minProperties: { $ref: "#/definitions/nonNegativeIntegerDefault0" }, required: { $ref: "#/definitions/stringArray" }, additionalProperties: { $ref: "#" }, definitions: { type: "object", additionalProperties: { $ref: "#" }, default: {} }, properties: { type: "object", additionalProperties: { $ref: "#" }, default: {} }, patternProperties: { type: "object", additionalProperties: { $ref: "#" }, propertyNames: { format: "regex" }, default: {} }, dependencies: { type: "object", additionalProperties: { anyOf: [{ $ref: "#" }, { $ref: "#/definitions/stringArray" }] } }, propertyNames: { $ref: "#" }, const: true, enum: { type: "array", items: true, minItems: 1, uniqueItems: true }, type: { anyOf: [{ $ref: "#/definitions/simpleTypes" }, { type: "array", items: { $ref: "#/definitions/simpleTypes" }, minItems: 1, uniqueItems: true }] }, format: { type: "string" }, contentMediaType: { type: "string" }, contentEncoding: { type: "string" }, if: { $ref: "#" }, then: { $ref: "#" }, else: { $ref: "#" }, allOf: { $ref: "#/definitions/schemaArray" }, anyOf: { $ref: "#/definitions/schemaArray" }, oneOf: { $ref: "#/definitions/schemaArray" }, not: { $ref: "#" } }, default: true };
});
var hU = k((N6, gU) => {
  Object.defineProperty(N6, "__esModule", { value: true });
  N6.MissingRefError = N6.ValidationError = N6.CodeGen = N6.Name = N6.nil = N6.stringify = N6.str = N6._ = N6.KeywordCxt = N6.Ajv = void 0;
  var OT = Aq(), wT = KD(), BT = LD(), jD = DD(), qT = ["/properties"], w5 = "http://json-schema.org/draft-07/schema";
  class YJ extends OT.default {
    _addVocabularies() {
      if (super._addVocabularies(), wT.default.forEach(($) => this.addVocabulary($)), this.opts.discriminator) this.addKeyword(BT.default);
    }
    _addDefaultMetaSchema() {
      if (super._addDefaultMetaSchema(), !this.opts.meta) return;
      let $ = this.opts.$data ? this.$dataMetaSchema(jD, qT) : jD;
      this.addMetaSchema($, w5, false), this.refs["http://json-schema.org/schema"] = w5;
    }
    defaultMeta() {
      return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(w5) ? w5 : void 0);
    }
  }
  N6.Ajv = YJ;
  gU.exports = N6 = YJ;
  gU.exports.Ajv = YJ;
  Object.defineProperty(N6, "__esModule", { value: true });
  N6.default = YJ;
  var LT = p9();
  Object.defineProperty(N6, "KeywordCxt", { enumerable: true, get: function() {
    return LT.KeywordCxt;
  } });
  var Q8 = a();
  Object.defineProperty(N6, "_", { enumerable: true, get: function() {
    return Q8._;
  } });
  Object.defineProperty(N6, "str", { enumerable: true, get: function() {
    return Q8.str;
  } });
  Object.defineProperty(N6, "stringify", { enumerable: true, get: function() {
    return Q8.stringify;
  } });
  Object.defineProperty(N6, "nil", { enumerable: true, get: function() {
    return Q8.nil;
  } });
  Object.defineProperty(N6, "Name", { enumerable: true, get: function() {
    return Q8.Name;
  } });
  Object.defineProperty(N6, "CodeGen", { enumerable: true, get: function() {
    return Q8.CodeGen;
  } });
  var DT = rQ();
  Object.defineProperty(N6, "ValidationError", { enumerable: true, get: function() {
    return DT.default;
  } });
  var jT = d9();
  Object.defineProperty(N6, "MissingRefError", { enumerable: true, get: function() {
    return jT.default;
  } });
});
var SD = k((RD) => {
  Object.defineProperty(RD, "__esModule", { value: true });
  RD.formatNames = RD.fastFormats = RD.fullFormats = void 0;
  function e6($, X) {
    return { validate: $, compare: X };
  }
  RD.fullFormats = { date: e6(ID, cU), time: e6(mU(true), pU), "date-time": e6(FD(true), ZD), "iso-time": e6(mU(), bD), "iso-date-time": e6(FD(), PD), duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/, uri: RT, "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i, "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i, url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu, email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i, hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i, ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/, ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i, regex: xT, uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i, "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/, "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i, "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/, byte: ET, int32: { type: "number", validate: CT }, int64: { type: "number", validate: kT }, float: { type: "number", validate: AD }, double: { type: "number", validate: AD }, password: true, binary: true };
  RD.fastFormats = { ...RD.fullFormats, date: e6(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, cU), time: e6(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, pU), "date-time": e6(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, ZD), "iso-time": e6(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, bD), "iso-date-time": e6(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, PD), uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i, "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i, email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i };
  RD.formatNames = Object.keys(RD.fullFormats);
  function AT($) {
    return $ % 4 === 0 && ($ % 100 !== 0 || $ % 400 === 0);
  }
  var IT = /^(\d\d\d\d)-(\d\d)-(\d\d)$/, bT = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function ID($) {
    let X = IT.exec($);
    if (!X) return false;
    let J = +X[1], Q = +X[2], Y = +X[3];
    return Q >= 1 && Q <= 12 && Y >= 1 && Y <= (Q === 2 && AT(J) ? 29 : bT[Q]);
  }
  function cU($, X) {
    if (!($ && X)) return;
    if ($ > X) return 1;
    if ($ < X) return -1;
    return 0;
  }
  var uU = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
  function mU($) {
    return function(J) {
      let Q = uU.exec(J);
      if (!Q) return false;
      let Y = +Q[1], W = +Q[2], z = +Q[3], G = Q[4], U = Q[5] === "-" ? -1 : 1, H = +(Q[6] || 0), K = +(Q[7] || 0);
      if (H > 23 || K > 59 || $ && !G) return false;
      if (Y <= 23 && W <= 59 && z < 60) return true;
      let V = W - K * U, N = Y - H * U - (V < 0 ? 1 : 0);
      return (N === 23 || N === -1) && (V === 59 || V === -1) && z < 61;
    };
  }
  function pU($, X) {
    if (!($ && X)) return;
    let J = (/* @__PURE__ */ new Date("2020-01-01T" + $)).valueOf(), Q = (/* @__PURE__ */ new Date("2020-01-01T" + X)).valueOf();
    if (!(J && Q)) return;
    return J - Q;
  }
  function bD($, X) {
    if (!($ && X)) return;
    let J = uU.exec($), Q = uU.exec(X);
    if (!(J && Q)) return;
    if ($ = J[1] + J[2] + J[3], X = Q[1] + Q[2] + Q[3], $ > X) return 1;
    if ($ < X) return -1;
    return 0;
  }
  var lU = /t|\s/i;
  function FD($) {
    let X = mU($);
    return function(Q) {
      let Y = Q.split(lU);
      return Y.length === 2 && ID(Y[0]) && X(Y[1]);
    };
  }
  function ZD($, X) {
    if (!($ && X)) return;
    let J = new Date($).valueOf(), Q = new Date(X).valueOf();
    if (!(J && Q)) return;
    return J - Q;
  }
  function PD($, X) {
    if (!($ && X)) return;
    let [J, Q] = $.split(lU), [Y, W] = X.split(lU), z = cU(J, Y);
    if (z === void 0) return;
    return z || pU(Q, W);
  }
  var ZT = /\/|:/, PT = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  function RT($) {
    return ZT.test($) && PT.test($);
  }
  var MD = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
  function ET($) {
    return MD.lastIndex = 0, MD.test($);
  }
  var ST = -2147483648, vT = 2147483647;
  function CT($) {
    return Number.isInteger($) && $ <= vT && $ >= ST;
  }
  function kT($) {
    return Number.isInteger($);
  }
  function AD() {
    return true;
  }
  var _T = /[^\\]\\Z/;
  function xT($) {
    if (_T.test($)) return false;
    try {
      return new RegExp($), true;
    } catch (X) {
      return false;
    }
  }
});
var CD = k((vD) => {
  Object.defineProperty(vD, "__esModule", { value: true });
  vD.formatLimitDefinition = void 0;
  var yT = hU(), d6 = a(), W1 = d6.operators, B5 = { formatMaximum: { okStr: "<=", ok: W1.LTE, fail: W1.GT }, formatMinimum: { okStr: ">=", ok: W1.GTE, fail: W1.LT }, formatExclusiveMaximum: { okStr: "<", ok: W1.LT, fail: W1.GTE }, formatExclusiveMinimum: { okStr: ">", ok: W1.GT, fail: W1.LTE } }, fT = { message: ({ keyword: $, schemaCode: X }) => d6.str`should be ${B5[$].okStr} ${X}`, params: ({ keyword: $, schemaCode: X }) => d6._`{comparison: ${B5[$].okStr}, limit: ${X}}` };
  vD.formatLimitDefinition = { keyword: Object.keys(B5), type: "string", schemaType: "string", $data: true, error: fT, code($) {
    let { gen: X, data: J, schemaCode: Q, keyword: Y, it: W } = $, { opts: z, self: G } = W;
    if (!z.validateFormats) return;
    let U = new yT.KeywordCxt(W, G.RULES.all.format.definition, "format");
    if (U.$data) H();
    else K();
    function H() {
      let N = X.scopeValue("formats", { ref: G.formats, code: z.code.formats }), O = X.const("fmt", d6._`${N}[${U.schemaCode}]`);
      $.fail$data((0, d6.or)(d6._`typeof ${O} != "object"`, d6._`${O} instanceof RegExp`, d6._`typeof ${O}.compare != "function"`, V(O)));
    }
    function K() {
      let N = U.schema, O = G.formats[N];
      if (!O || O === true) return;
      if (typeof O != "object" || O instanceof RegExp || typeof O.compare != "function") throw Error(`"${Y}": format "${N}" does not define "compare" function`);
      let w = X.scopeValue("formats", { key: N, ref: O, code: z.code.formats ? d6._`${z.code.formats}${(0, d6.getProperty)(N)}` : void 0 });
      $.fail$data(V(w));
    }
    function V(N) {
      return d6._`${N}.compare(${J}, ${Q}) ${B5[Y].fail} 0`;
    }
  }, dependencies: ["format"] };
  var gT = ($) => {
    return $.addKeyword(vD.formatLimitDefinition), $;
  };
  vD.default = gT;
});
var TD = k((QJ, xD) => {
  Object.defineProperty(QJ, "__esModule", { value: true });
  var W8 = SD(), uT = CD(), nU = a(), kD = new nU.Name("fullFormats"), mT = new nU.Name("fastFormats"), rU = ($, X = { keywords: true }) => {
    if (Array.isArray(X)) return _D($, X, W8.fullFormats, kD), $;
    let [J, Q] = X.mode === "fast" ? [W8.fastFormats, mT] : [W8.fullFormats, kD], Y = X.formats || W8.formatNames;
    if (_D($, Y, J, Q), X.keywords) (0, uT.default)($);
    return $;
  };
  rU.get = ($, X = "full") => {
    let Q = (X === "fast" ? W8.fastFormats : W8.fullFormats)[$];
    if (!Q) throw Error(`Unknown format "${$}"`);
    return Q;
  };
  function _D($, X, J, Q) {
    var Y, W;
    (Y = (W = $.opts.code).formats) !== null && Y !== void 0 || (W.formats = nU._`require("ajv-formats/dist/formats").${Q}`);
    for (let z of X) $.addFormat(z, J[z]);
  }
  xD.exports = QJ = rU;
  Object.defineProperty(QJ, "__esModule", { value: true });
  QJ.default = rU;
});
var xj = 50;
function d1($ = xj) {
  let X = new AbortController();
  return _j($, X.signal), X;
}
function LH($, X, J) {
  return new Promise((Q, Y) => {
    if (X?.aborted) {
      if (J?.throwOnAbort || J?.abortError) Y(J.abortError?.() ?? Error("aborted"));
      else Q();
      return;
    }
    let W = setTimeout((G, U, H) => {
      G?.removeEventListener("abort", U), H();
    }, $, X, z, Q);
    function z() {
      if (clearTimeout(W), J?.throwOnAbort || J?.abortError) Y(J.abortError?.() ?? Error("aborted"));
      else Q();
    }
    if (X?.addEventListener("abort", z, { once: true }), J?.unref) W.unref();
  });
}
function Tj($, X) {
  $(Error(X));
}
function K1($, X, J) {
  let Q, Y = new Promise((W, z) => {
    if (Q = setTimeout(Tj, X, z, J), typeof Q === "object") Q.unref?.();
  });
  return Promise.race([$, Y]).finally(() => {
    if (Q !== void 0) clearTimeout(Q);
  });
}
var J6 = class extends Error {
};
function i1() {
  return process.versions.bun !== void 0;
}
function r$($) {
  if (!$) return false;
  if (typeof $ === "boolean") return $;
  let X = String($).toLowerCase().trim();
  return ["1", "true", "yes", "on"].includes(X);
}
function n1() {
  let $ = /* @__PURE__ */ new Set();
  return { subscribe(X) {
    return $.add(X), () => {
      $.delete(X);
    };
  }, emit(...X) {
    let J;
    for (let Q of $) try {
      Q(...X);
    } catch (Y) {
      (J ??= []).push(Y);
    }
    if (J) throw J.length === 1 ? J[0] : AggregateError(J, "Signal listener(s) threw");
  }, clear() {
    $.clear();
  } };
}
var uj = typeof global == "object" && global && global.Object === Object && global;
var DH = uj;
var mj = typeof self == "object" && self && self.Object === Object && self;
var lj = DH || mj || Function("return this")();
var r1 = lj;
var cj = r1.Symbol;
var o1 = cj;
var jH = Object.prototype;
var pj = jH.hasOwnProperty;
var dj = jH.toString;
var O8 = o1 ? o1.toStringTag : void 0;
function ij($) {
  var X = pj.call($, O8), J = $[O8];
  try {
    $[O8] = void 0;
    var Q = true;
  } catch (W) {
  }
  var Y = dj.call($);
  if (Q) if (X) $[O8] = J;
  else delete $[O8];
  return Y;
}
var FH = ij;
var nj = Object.prototype;
var rj = nj.toString;
function oj($) {
  return rj.call($);
}
var MH = oj;
var tj = "[object Null]";
var aj = "[object Undefined]";
var AH = o1 ? o1.toStringTag : void 0;
function sj($) {
  if ($ == null) return $ === void 0 ? aj : tj;
  return AH && AH in Object($) ? FH($) : MH($);
}
var IH = sj;
function ej($) {
  var X = typeof $;
  return $ != null && (X == "object" || X == "function");
}
var UJ = ej;
var $F = "[object AsyncFunction]";
var XF = "[object Function]";
var JF = "[object GeneratorFunction]";
var YF = "[object Proxy]";
function QF($) {
  if (!UJ($)) return false;
  var X = IH($);
  return X == XF || X == JF || X == $F || X == YF;
}
var bH = QF;
var WF = r1["__core-js_shared__"];
var HJ = WF;
var ZH = (function() {
  var $ = /[^.]+$/.exec(HJ && HJ.keys && HJ.keys.IE_PROTO || "");
  return $ ? "Symbol(src)_1." + $ : "";
})();
function zF($) {
  return !!ZH && ZH in $;
}
var PH = zF;
var GF = Function.prototype;
var UF = GF.toString;
function HF($) {
  if ($ != null) {
    try {
      return UF.call($);
    } catch (X) {
    }
    try {
      return $ + "";
    } catch (X) {
    }
  }
  return "";
}
var RH = HF;
var KF = /[\\^$.*+?()[\]{}|]/g;
var VF = /^\[object .+?Constructor\]$/;
var NF = Function.prototype;
var OF = Object.prototype;
var wF = NF.toString;
var BF = OF.hasOwnProperty;
var qF = RegExp("^" + wF.call(BF).replace(KF, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$");
function LF($) {
  if (!UJ($) || PH($)) return false;
  var X = bH($) ? qF : VF;
  return X.test(RH($));
}
var EH = LF;
function DF($, X) {
  return $ == null ? void 0 : $[X];
}
var SH = DF;
function jF($, X) {
  var J = SH($, X);
  return EH(J) ? J : void 0;
}
var KJ = jF;
var FF = KJ(Object, "create");
var W4 = FF;
function MF() {
  this.__data__ = W4 ? W4(null) : {}, this.size = 0;
}
var vH = MF;
function AF($) {
  var X = this.has($) && delete this.__data__[$];
  return this.size -= X ? 1 : 0, X;
}
var CH = AF;
var IF = "__lodash_hash_undefined__";
var bF = Object.prototype;
var ZF = bF.hasOwnProperty;
function PF($) {
  var X = this.__data__;
  if (W4) {
    var J = X[$];
    return J === IF ? void 0 : J;
  }
  return ZF.call(X, $) ? X[$] : void 0;
}
var kH = PF;
var RF = Object.prototype;
var EF = RF.hasOwnProperty;
function SF($) {
  var X = this.__data__;
  return W4 ? X[$] !== void 0 : EF.call(X, $);
}
var _H = SF;
var vF = "__lodash_hash_undefined__";
function CF($, X) {
  var J = this.__data__;
  return this.size += this.has($) ? 0 : 1, J[$] = W4 && X === void 0 ? vF : X, this;
}
var xH = CF;
function t1($) {
  var X = -1, J = $ == null ? 0 : $.length;
  this.clear();
  while (++X < J) {
    var Q = $[X];
    this.set(Q[0], Q[1]);
  }
}
t1.prototype.clear = vH;
t1.prototype.delete = CH;
t1.prototype.get = kH;
t1.prototype.has = _H;
t1.prototype.set = xH;
var A5 = t1;
function kF() {
  this.__data__ = [], this.size = 0;
}
var TH = kF;
function _F($, X) {
  return $ === X || $ !== $ && X !== X;
}
var yH = _F;
function xF($, X) {
  var J = $.length;
  while (J--) if (yH($[J][0], X)) return J;
  return -1;
}
var E4 = xF;
var TF = Array.prototype;
var yF = TF.splice;
function fF($) {
  var X = this.__data__, J = E4(X, $);
  if (J < 0) return false;
  var Q = X.length - 1;
  if (J == Q) X.pop();
  else yF.call(X, J, 1);
  return --this.size, true;
}
var fH = fF;
function gF($) {
  var X = this.__data__, J = E4(X, $);
  return J < 0 ? void 0 : X[J][1];
}
var gH = gF;
function hF($) {
  return E4(this.__data__, $) > -1;
}
var hH = hF;
function uF($, X) {
  var J = this.__data__, Q = E4(J, $);
  if (Q < 0) ++this.size, J.push([$, X]);
  else J[Q][1] = X;
  return this;
}
var uH = uF;
function a1($) {
  var X = -1, J = $ == null ? 0 : $.length;
  this.clear();
  while (++X < J) {
    var Q = $[X];
    this.set(Q[0], Q[1]);
  }
}
a1.prototype.clear = TH;
a1.prototype.delete = fH;
a1.prototype.get = gH;
a1.prototype.has = hH;
a1.prototype.set = uH;
var mH = a1;
var mF = KJ(r1, "Map");
var lH = mF;
function lF() {
  this.size = 0, this.__data__ = { hash: new A5(), map: new (lH || mH)(), string: new A5() };
}
var cH = lF;
function cF($) {
  var X = typeof $;
  return X == "string" || X == "number" || X == "symbol" || X == "boolean" ? $ !== "__proto__" : $ === null;
}
var pH = cF;
function pF($, X) {
  var J = $.__data__;
  return pH(X) ? J[typeof X == "string" ? "string" : "hash"] : J.map;
}
var S4 = pF;
function dF($) {
  var X = S4(this, $).delete($);
  return this.size -= X ? 1 : 0, X;
}
var dH = dF;
function iF($) {
  return S4(this, $).get($);
}
var iH = iF;
function nF($) {
  return S4(this, $).has($);
}
var nH = nF;
function rF($, X) {
  var J = S4(this, $), Q = J.size;
  return J.set($, X), this.size += J.size == Q ? 0 : 1, this;
}
var rH = rF;
function s1($) {
  var X = -1, J = $ == null ? 0 : $.length;
  this.clear();
  while (++X < J) {
    var Q = $[X];
    this.set(Q[0], Q[1]);
  }
}
s1.prototype.clear = cH;
s1.prototype.delete = dH;
s1.prototype.get = iH;
s1.prototype.has = nH;
s1.prototype.set = rH;
var I5 = s1;
var oF = "Expected a function";
function b5($, X) {
  if (typeof $ != "function" || X != null && typeof X != "function") throw TypeError(oF);
  var J = function() {
    var Q = arguments, Y = X ? X.apply(this, Q) : Q[0], W = J.cache;
    if (W.has(Y)) return W.get(Y);
    var z = $.apply(this, Q);
    return J.cache = W.set(Y, z) || W, z;
  };
  return J.cache = new (b5.Cache || I5)(), J;
}
b5.Cache = I5;
var C6 = b5;
var v4 = C6(() => {
  return (process.env.CLAUDE_CONFIG_DIR ?? aF(tF(), ".claude")).normalize("NFC");
}, () => process.env.CLAUDE_CONFIG_DIR);
function v($, X, J, Q, Y) {
  if (Q === "m") throw TypeError("Private method is not writable");
  if (Q === "a" && !Y) throw TypeError("Private accessor was defined without a setter");
  if (typeof X === "function" ? $ !== X || !Y : !X.has($)) throw TypeError("Cannot write private member to an object whose class did not declare it");
  return Q === "a" ? Y.call($, J) : Y ? Y.value = J : X.set($, J), J;
}
function L($, X, J, Q) {
  if (J === "a" && !Q) throw TypeError("Private accessor was defined without a getter");
  if (typeof X === "function" ? $ !== X || !Q : !X.has($)) throw TypeError("Cannot read private member from an object whose class did not declare it");
  return J === "m" ? Q : J === "a" ? Q.call($) : Q ? Q.value : X.get($);
}
var Z5 = function() {
  let { crypto: $ } = globalThis;
  if ($?.randomUUID) return Z5 = $.randomUUID.bind($), $.randomUUID();
  let X = new Uint8Array(1), J = $ ? () => $.getRandomValues(X)[0] : () => Math.random() * 255 & 255;
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (Q) => (+Q ^ J() & 15 >> +Q / 4).toString(16));
};
function z4($) {
  return typeof $ === "object" && $ !== null && ("name" in $ && $.name === "AbortError" || "message" in $ && String($.message).includes("FetchRequestCanceledException"));
}
var w8 = ($) => {
  if ($ instanceof Error) return $;
  if (typeof $ === "object" && $ !== null) {
    try {
      if (Object.prototype.toString.call($) === "[object Error]") {
        let X = Error($.message, $.cause ? { cause: $.cause } : {});
        if ($.stack) X.stack = $.stack;
        if ($.cause && !X.cause) X.cause = $.cause;
        if ($.name) X.name = $.name;
        return X;
      }
    } catch {
    }
    try {
      return Error(JSON.stringify($));
    } catch {
    }
  }
  return Error($);
};
var y = class extends Error {
};
var C$ = class _C$ extends y {
  constructor($, X, J, Q, Y) {
    super(`${_C$.makeMessage($, X, J)}`);
    this.status = $, this.headers = Q, this.requestID = Q?.get("request-id"), this.error = X, this.type = Y ?? null;
  }
  static makeMessage($, X, J) {
    let Q = X?.message ? typeof X.message === "string" ? X.message : JSON.stringify(X.message) : X ? JSON.stringify(X) : J;
    if ($ && Q) return `${$} ${Q}`;
    if ($) return `${$} status code (no body)`;
    if (Q) return Q;
    return "(no status code or body)";
  }
  static generate($, X, J, Q) {
    if (!$ || !Q) return new V1({ message: J, cause: w8(X) });
    let Y = X, W = Y?.error?.type;
    if ($ === 400) return new q8($, Y, J, Q, W);
    if ($ === 401) return new L8($, Y, J, Q, W);
    if ($ === 403) return new D8($, Y, J, Q, W);
    if ($ === 404) return new j8($, Y, J, Q, W);
    if ($ === 409) return new F8($, Y, J, Q, W);
    if ($ === 422) return new M8($, Y, J, Q, W);
    if ($ === 429) return new A8($, Y, J, Q, W);
    if ($ >= 500) return new I8($, Y, J, Q, W);
    return new _C$($, Y, J, Q, W);
  }
};
var g$ = class extends C$ {
  constructor({ message: $ } = {}) {
    super(void 0, void 0, $ || "Request was aborted.", void 0);
  }
};
var V1 = class extends C$ {
  constructor({ message: $, cause: X }) {
    super(void 0, void 0, $ || "Connection error.", void 0);
    if (X) this.cause = X;
  }
};
var B8 = class extends V1 {
  constructor({ message: $ } = {}) {
    super({ message: $ ?? "Request timed out." });
  }
};
var q8 = class extends C$ {
};
var L8 = class extends C$ {
};
var D8 = class extends C$ {
};
var j8 = class extends C$ {
};
var F8 = class extends C$ {
};
var M8 = class extends C$ {
};
var A8 = class extends C$ {
};
var I8 = class extends C$ {
};
var eF = /^[a-z][a-z0-9+.-]*:/i;
var oH = ($) => {
  return eF.test($);
};
var P5 = ($) => (P5 = Array.isArray, P5($));
var R5 = P5;
function VJ($) {
  if (typeof $ !== "object") return {};
  return $ ?? {};
}
function E5($) {
  if (!$) return true;
  for (let X in $) return false;
  return true;
}
function tH($, X) {
  return Object.prototype.hasOwnProperty.call($, X);
}
var aH = ($, X) => {
  if (typeof X !== "number" || !Number.isInteger(X)) throw new y(`${$} must be an integer`);
  if (X < 0) throw new y(`${$} must be a positive integer`);
  return X;
};
var NJ = ($) => {
  try {
    return JSON.parse($);
  } catch (X) {
    return;
  }
};
var sH = ($) => new Promise((X) => setTimeout(X, $));
var C4 = "0.81.0";
var JK = () => {
  return typeof window < "u" && typeof window.document < "u" && typeof navigator < "u";
};
function $M() {
  if (typeof Deno < "u" && Deno.build != null) return "deno";
  if (typeof EdgeRuntime < "u") return "edge";
  if (Object.prototype.toString.call(typeof globalThis.process < "u" ? globalThis.process : 0) === "[object process]") return "node";
  return "unknown";
}
var XM = () => {
  let $ = $M();
  if ($ === "deno") return { "X-Stainless-Lang": "js", "X-Stainless-Package-Version": C4, "X-Stainless-OS": $K(Deno.build.os), "X-Stainless-Arch": eH(Deno.build.arch), "X-Stainless-Runtime": "deno", "X-Stainless-Runtime-Version": typeof Deno.version === "string" ? Deno.version : Deno.version?.deno ?? "unknown" };
  if (typeof EdgeRuntime < "u") return { "X-Stainless-Lang": "js", "X-Stainless-Package-Version": C4, "X-Stainless-OS": "Unknown", "X-Stainless-Arch": `other:${EdgeRuntime}`, "X-Stainless-Runtime": "edge", "X-Stainless-Runtime-Version": globalThis.process.version };
  if ($ === "node") return { "X-Stainless-Lang": "js", "X-Stainless-Package-Version": C4, "X-Stainless-OS": $K(globalThis.process.platform ?? "unknown"), "X-Stainless-Arch": eH(globalThis.process.arch ?? "unknown"), "X-Stainless-Runtime": "node", "X-Stainless-Runtime-Version": globalThis.process.version ?? "unknown" };
  let X = JM();
  if (X) return { "X-Stainless-Lang": "js", "X-Stainless-Package-Version": C4, "X-Stainless-OS": "Unknown", "X-Stainless-Arch": "unknown", "X-Stainless-Runtime": `browser:${X.browser}`, "X-Stainless-Runtime-Version": X.version };
  return { "X-Stainless-Lang": "js", "X-Stainless-Package-Version": C4, "X-Stainless-OS": "Unknown", "X-Stainless-Arch": "unknown", "X-Stainless-Runtime": "unknown", "X-Stainless-Runtime-Version": "unknown" };
};
function JM() {
  if (typeof navigator > "u" || !navigator) return null;
  let $ = [{ key: "edge", pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ }, { key: "ie", pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ }, { key: "ie", pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ }, { key: "chrome", pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ }, { key: "firefox", pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ }, { key: "safari", pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ }];
  for (let { key: X, pattern: J } of $) {
    let Q = J.exec(navigator.userAgent);
    if (Q) {
      let Y = Q[1] || 0, W = Q[2] || 0, z = Q[3] || 0;
      return { browser: X, version: `${Y}.${W}.${z}` };
    }
  }
  return null;
}
var eH = ($) => {
  if ($ === "x32") return "x32";
  if ($ === "x86_64" || $ === "x64") return "x64";
  if ($ === "arm") return "arm";
  if ($ === "aarch64" || $ === "arm64") return "arm64";
  if ($) return `other:${$}`;
  return "unknown";
};
var $K = ($) => {
  if ($ = $.toLowerCase(), $.includes("ios")) return "iOS";
  if ($ === "android") return "Android";
  if ($ === "darwin") return "MacOS";
  if ($ === "win32") return "Windows";
  if ($ === "freebsd") return "FreeBSD";
  if ($ === "openbsd") return "OpenBSD";
  if ($ === "linux") return "Linux";
  if ($) return `Other:${$}`;
  return "Unknown";
};
var XK;
var YK = () => {
  return XK ?? (XK = XM());
};
function QK() {
  if (typeof fetch < "u") return fetch;
  throw Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new Anthropic({ fetch })` or polyfill the global, `globalThis.fetch = fetch`");
}
function S5(...$) {
  let X = globalThis.ReadableStream;
  if (typeof X > "u") throw Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
  return new X(...$);
}
function OJ($) {
  let X = Symbol.asyncIterator in $ ? $[Symbol.asyncIterator]() : $[Symbol.iterator]();
  return S5({ start() {
  }, async pull(J) {
    let { done: Q, value: Y } = await X.next();
    if (Q) J.close();
    else J.enqueue(Y);
  }, async cancel() {
    await X.return?.();
  } });
}
function b8($) {
  if ($[Symbol.asyncIterator]) return $;
  let X = $.getReader();
  return { async next() {
    try {
      let J = await X.read();
      if (J?.done) X.releaseLock();
      return J;
    } catch (J) {
      throw X.releaseLock(), J;
    }
  }, async return() {
    let J = X.cancel();
    return X.releaseLock(), await J, { done: true, value: void 0 };
  }, [Symbol.asyncIterator]() {
    return this;
  } };
}
async function WK($) {
  if ($ === null || typeof $ !== "object") return;
  if ($[Symbol.asyncIterator]) {
    await $[Symbol.asyncIterator]().return?.();
    return;
  }
  let X = $.getReader(), J = X.cancel();
  X.releaseLock(), await J;
}
var zK = ({ headers: $, body: X }) => {
  return { bodyHeaders: { "content-type": "application/json" }, body: JSON.stringify(X) };
};
function GK($) {
  return Object.entries($).filter(([X, J]) => typeof J < "u").map(([X, J]) => {
    if (typeof J === "string" || typeof J === "number" || typeof J === "boolean") return `${encodeURIComponent(X)}=${encodeURIComponent(J)}`;
    if (J === null) return `${encodeURIComponent(X)}=`;
    throw new y(`Cannot stringify type ${typeof J}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`);
  }).join("&");
}
function KK($) {
  let X = 0;
  for (let Y of $) X += Y.length;
  let J = new Uint8Array(X), Q = 0;
  for (let Y of $) J.set(Y, Q), Q += Y.length;
  return J;
}
var UK;
function Z8($) {
  let X;
  return (UK ?? (X = new globalThis.TextEncoder(), UK = X.encode.bind(X)))($);
}
var HK;
function v5($) {
  let X;
  return (HK ?? (X = new globalThis.TextDecoder(), HK = X.decode.bind(X)))($);
}
var O6;
var w6;
var k4 = class {
  constructor() {
    O6.set(this, void 0), w6.set(this, void 0), v(this, O6, new Uint8Array(), "f"), v(this, w6, null, "f");
  }
  decode($) {
    if ($ == null) return [];
    let X = $ instanceof ArrayBuffer ? new Uint8Array($) : typeof $ === "string" ? Z8($) : $;
    v(this, O6, KK([L(this, O6, "f"), X]), "f");
    let J = [], Q;
    while ((Q = WM(L(this, O6, "f"), L(this, w6, "f"))) != null) {
      if (Q.carriage && L(this, w6, "f") == null) {
        v(this, w6, Q.index, "f");
        continue;
      }
      if (L(this, w6, "f") != null && (Q.index !== L(this, w6, "f") + 1 || Q.carriage)) {
        J.push(v5(L(this, O6, "f").subarray(0, L(this, w6, "f") - 1))), v(this, O6, L(this, O6, "f").subarray(L(this, w6, "f")), "f"), v(this, w6, null, "f");
        continue;
      }
      let Y = L(this, w6, "f") !== null ? Q.preceding - 1 : Q.preceding, W = v5(L(this, O6, "f").subarray(0, Y));
      J.push(W), v(this, O6, L(this, O6, "f").subarray(Q.index), "f"), v(this, w6, null, "f");
    }
    return J;
  }
  flush() {
    if (!L(this, O6, "f").length) return [];
    return this.decode(`
`);
  }
};
O6 = /* @__PURE__ */ new WeakMap(), w6 = /* @__PURE__ */ new WeakMap();
k4.NEWLINE_CHARS = /* @__PURE__ */ new Set([`
`, "\r"]);
k4.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
function WM($, X) {
  for (let Y = X ?? 0; Y < $.length; Y++) {
    if ($[Y] === 10) return { preceding: Y, index: Y + 1, carriage: false };
    if ($[Y] === 13) return { preceding: Y, index: Y + 1, carriage: true };
  }
  return null;
}
function VK($) {
  for (let Q = 0; Q < $.length - 1; Q++) {
    if ($[Q] === 10 && $[Q + 1] === 10) return Q + 2;
    if ($[Q] === 13 && $[Q + 1] === 13) return Q + 2;
    if ($[Q] === 13 && $[Q + 1] === 10 && Q + 3 < $.length && $[Q + 2] === 13 && $[Q + 3] === 10) return Q + 4;
  }
  return -1;
}
var BJ = { off: 0, error: 200, warn: 300, info: 400, debug: 500 };
var C5 = ($, X, J) => {
  if (!$) return;
  if (tH(BJ, $)) return $;
  y$(J).warn(`${X} was set to ${JSON.stringify($)}, expected one of ${JSON.stringify(Object.keys(BJ))}`);
  return;
};
function P8() {
}
function wJ($, X, J) {
  if (!X || BJ[$] > BJ[J]) return P8;
  else return X[$].bind(X);
}
var zM = { error: P8, warn: P8, info: P8, debug: P8 };
var NK = /* @__PURE__ */ new WeakMap();
function y$($) {
  let X = $.logger, J = $.logLevel ?? "off";
  if (!X) return zM;
  let Q = NK.get(X);
  if (Q && Q[0] === J) return Q[1];
  let Y = { error: wJ("error", X, J), warn: wJ("warn", X, J), info: wJ("info", X, J), debug: wJ("debug", X, J) };
  return NK.set(X, [J, Y]), Y;
}
var G4 = ($) => {
  if ($.options) $.options = { ...$.options }, delete $.options.headers;
  if ($.headers) $.headers = Object.fromEntries(($.headers instanceof Headers ? [...$.headers] : Object.entries($.headers)).map(([X, J]) => [X, X.toLowerCase() === "x-api-key" || X.toLowerCase() === "authorization" || X.toLowerCase() === "cookie" || X.toLowerCase() === "set-cookie" ? "***" : J]));
  if ("retryOfRequestLogID" in $) {
    if ($.retryOfRequestLogID) $.retryOf = $.retryOfRequestLogID;
    delete $.retryOfRequestLogID;
  }
  return $;
};
var R8;
var B6 = class _B6 {
  constructor($, X, J) {
    this.iterator = $, R8.set(this, void 0), this.controller = X, v(this, R8, J, "f");
  }
  static fromSSEResponse($, X, J) {
    let Q = false, Y = J ? y$(J) : console;
    async function* W() {
      if (Q) throw new y("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      Q = true;
      let z = false;
      try {
        for await (let G of GM($, X)) {
          if (G.event === "completion") try {
            yield JSON.parse(G.data);
          } catch (U) {
            throw Y.error("Could not parse message into JSON:", G.data), Y.error("From chunk:", G.raw), U;
          }
          if (G.event === "message_start" || G.event === "message_delta" || G.event === "message_stop" || G.event === "content_block_start" || G.event === "content_block_delta" || G.event === "content_block_stop") try {
            yield JSON.parse(G.data);
          } catch (U) {
            throw Y.error("Could not parse message into JSON:", G.data), Y.error("From chunk:", G.raw), U;
          }
          if (G.event === "ping") continue;
          if (G.event === "error") {
            let U = NJ(G.data) ?? G.data, H = U?.error?.type;
            throw new C$(void 0, U, void 0, $.headers, H);
          }
        }
        z = true;
      } catch (G) {
        if (z4(G)) return;
        throw G;
      } finally {
        if (!z) X.abort();
      }
    }
    return new _B6(W, X, J);
  }
  static fromReadableStream($, X, J) {
    let Q = false;
    async function* Y() {
      let z = new k4(), G = b8($);
      for await (let U of G) for (let H of z.decode(U)) yield H;
      for (let U of z.flush()) yield U;
    }
    async function* W() {
      if (Q) throw new y("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      Q = true;
      let z = false;
      try {
        for await (let G of Y()) {
          if (z) continue;
          if (G) yield JSON.parse(G);
        }
        z = true;
      } catch (G) {
        if (z4(G)) return;
        throw G;
      } finally {
        if (!z) X.abort();
      }
    }
    return new _B6(W, X, J);
  }
  [(R8 = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
    return this.iterator();
  }
  tee() {
    let $ = [], X = [], J = this.iterator(), Q = (Y) => {
      return { next: () => {
        if (Y.length === 0) {
          let W = J.next();
          $.push(W), X.push(W);
        }
        return Y.shift();
      } };
    };
    return [new _B6(() => Q($), this.controller, L(this, R8, "f")), new _B6(() => Q(X), this.controller, L(this, R8, "f"))];
  }
  toReadableStream() {
    let $ = this, X;
    return S5({ async start() {
      X = $[Symbol.asyncIterator]();
    }, async pull(J) {
      try {
        let { value: Q, done: Y } = await X.next();
        if (Y) return J.close();
        let W = Z8(JSON.stringify(Q) + `
`);
        J.enqueue(W);
      } catch (Q) {
        J.error(Q);
      }
    }, async cancel() {
      await X.return?.();
    } });
  }
};
async function* GM($, X) {
  if (!$.body) {
    if (X.abort(), typeof globalThis.navigator < "u" && globalThis.navigator.product === "ReactNative") throw new y("The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api");
    throw new y("Attempted to iterate over a response with no body");
  }
  let J = new OK(), Q = new k4(), Y = b8($.body);
  for await (let W of UM(Y)) for (let z of Q.decode(W)) {
    let G = J.decode(z);
    if (G) yield G;
  }
  for (let W of Q.flush()) {
    let z = J.decode(W);
    if (z) yield z;
  }
}
async function* UM($) {
  let X = new Uint8Array();
  for await (let J of $) {
    if (J == null) continue;
    let Q = J instanceof ArrayBuffer ? new Uint8Array(J) : typeof J === "string" ? Z8(J) : J, Y = new Uint8Array(X.length + Q.length);
    Y.set(X), Y.set(Q, X.length), X = Y;
    let W;
    while ((W = VK(X)) !== -1) yield X.slice(0, W), X = X.slice(W);
  }
  if (X.length > 0) yield X;
}
var OK = class {
  constructor() {
    this.event = null, this.data = [], this.chunks = [];
  }
  decode($) {
    if ($.endsWith("\r")) $ = $.substring(0, $.length - 1);
    if (!$) {
      if (!this.event && !this.data.length) return null;
      let Y = { event: this.event, data: this.data.join(`
`), raw: this.chunks };
      return this.event = null, this.data = [], this.chunks = [], Y;
    }
    if (this.chunks.push($), $.startsWith(":")) return null;
    let [X, J, Q] = HM($, ":");
    if (Q.startsWith(" ")) Q = Q.substring(1);
    if (X === "event") this.event = Q;
    else if (X === "data") this.data.push(Q);
    return null;
  }
};
function HM($, X) {
  let J = $.indexOf(X);
  if (J !== -1) return [$.substring(0, J), X, $.substring(J + X.length)];
  return [$, "", ""];
}
async function qJ($, X) {
  let { response: J, requestLogID: Q, retryOfRequestLogID: Y, startTime: W } = X, z = await (async () => {
    if (X.options.stream) {
      if (y$($).debug("response", J.status, J.url, J.headers, J.body), X.options.__streamClass) return X.options.__streamClass.fromSSEResponse(J, X.controller);
      return B6.fromSSEResponse(J, X.controller);
    }
    if (J.status === 204) return null;
    if (X.options.__binaryResponse) return J;
    let U = J.headers.get("content-type")?.split(";")[0]?.trim();
    if (U?.includes("application/json") || U?.endsWith("+json")) {
      if (J.headers.get("content-length") === "0") return;
      let N = await J.json();
      return k5(N, J);
    }
    return await J.text();
  })();
  return y$($).debug(`[${Q}] response parsed`, G4({ retryOfRequestLogID: Y, url: J.url, status: J.status, body: z, durationMs: Date.now() - W })), z;
}
function k5($, X) {
  if (!$ || typeof $ !== "object" || Array.isArray($)) return $;
  return Object.defineProperty($, "_request_id", { value: X.headers.get("request-id"), enumerable: false });
}
var E8;
var N1 = class _N1 extends Promise {
  constructor($, X, J = qJ) {
    super((Q) => {
      Q(null);
    });
    this.responsePromise = X, this.parseResponse = J, E8.set(this, void 0), v(this, E8, $, "f");
  }
  _thenUnwrap($) {
    return new _N1(L(this, E8, "f"), this.responsePromise, async (X, J) => k5($(await this.parseResponse(X, J), J), J.response));
  }
  asResponse() {
    return this.responsePromise.then(($) => $.response);
  }
  async withResponse() {
    let [$, X] = await Promise.all([this.parse(), this.asResponse()]);
    return { data: $, response: X, request_id: X.headers.get("request-id") };
  }
  parse() {
    if (!this.parsedPromise) this.parsedPromise = this.responsePromise.then(($) => this.parseResponse(L(this, E8, "f"), $));
    return this.parsedPromise;
  }
  then($, X) {
    return this.parse().then($, X);
  }
  catch($) {
    return this.parse().catch($);
  }
  finally($) {
    return this.parse().finally($);
  }
};
E8 = /* @__PURE__ */ new WeakMap();
var LJ;
var _5 = class {
  constructor($, X, J, Q) {
    LJ.set(this, void 0), v(this, LJ, $, "f"), this.options = Q, this.response = X, this.body = J;
  }
  hasNextPage() {
    if (!this.getPaginatedItems().length) return false;
    return this.nextPageRequestOptions() != null;
  }
  async getNextPage() {
    let $ = this.nextPageRequestOptions();
    if (!$) throw new y("No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.");
    return await L(this, LJ, "f").requestAPIList(this.constructor, $);
  }
  async *iterPages() {
    let $ = this;
    yield $;
    while ($.hasNextPage()) $ = await $.getNextPage(), yield $;
  }
  async *[(LJ = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
    for await (let $ of this.iterPages()) for (let X of $.getPaginatedItems()) yield X;
  }
};
var DJ = class extends N1 {
  constructor($, X, J) {
    super($, X, async (Q, Y) => new J(Q, Y.response, await qJ(Q, Y), Y.options));
  }
  async *[Symbol.asyncIterator]() {
    let $ = await this;
    for await (let X of $) yield X;
  }
};
var k6 = class extends _5 {
  constructor($, X, J, Q) {
    super($, X, J, Q);
    this.data = J.data || [], this.has_more = J.has_more || false, this.first_id = J.first_id || null, this.last_id = J.last_id || null;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    if (this.has_more === false) return false;
    return super.hasNextPage();
  }
  nextPageRequestOptions() {
    if (this.options.query?.before_id) {
      let X = this.first_id;
      if (!X) return null;
      return { ...this.options, query: { ...VJ(this.options.query), before_id: X } };
    }
    let $ = this.last_id;
    if (!$) return null;
    return { ...this.options, query: { ...VJ(this.options.query), after_id: $ } };
  }
};
var S8 = class extends _5 {
  constructor($, X, J, Q) {
    super($, X, J, Q);
    this.data = J.data || [], this.has_more = J.has_more || false, this.next_page = J.next_page || null;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    if (this.has_more === false) return false;
    return super.hasNextPage();
  }
  nextPageRequestOptions() {
    let $ = this.next_page;
    if (!$) return null;
    return { ...this.options, query: { ...VJ(this.options.query), page: $ } };
  }
};
var T5 = () => {
  if (typeof File > "u") {
    let { process: $ } = globalThis, X = typeof $?.versions?.node === "string" && parseInt($.versions.node.split(".")) < 20;
    throw Error("`File` is not defined as a global, which is required for file uploads." + (X ? " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`." : ""));
  }
};
function O1($, X, J) {
  return T5(), new File($, X ?? "unknown_file", J);
}
function v8($, X) {
  let J = typeof $ === "object" && $ !== null && ("name" in $ && $.name && String($.name) || "url" in $ && $.url && String($.url) || "filename" in $ && $.filename && String($.filename) || "path" in $ && $.path && String($.path)) || "";
  return X ? J.split(/[\\/]/).pop() || void 0 : J;
}
var y5 = ($) => $ != null && typeof $ === "object" && typeof $[Symbol.asyncIterator] === "function";
var e1 = async ($, X, J = true) => {
  return { ...$, body: await NM($.body, X, J) };
};
var wK = /* @__PURE__ */ new WeakMap();
function VM($) {
  let X = typeof $ === "function" ? $ : $.fetch, J = wK.get(X);
  if (J) return J;
  let Q = (async () => {
    try {
      let Y = "Response" in X ? X.Response : (await X("data:,")).constructor, W = new FormData();
      if (W.toString() === await new Y(W).text()) return false;
      return true;
    } catch {
      return true;
    }
  })();
  return wK.set(X, Q), Q;
}
var NM = async ($, X, J = true) => {
  if (!await VM(X)) throw TypeError("The provided fetch function does not support file uploads with the current global FormData class.");
  let Q = new FormData();
  return await Promise.all(Object.entries($ || {}).map(([Y, W]) => x5(Q, Y, W, J))), Q;
};
var OM = ($) => $ instanceof Blob && "name" in $;
var x5 = async ($, X, J, Q) => {
  if (J === void 0) return;
  if (J == null) throw TypeError(`Received null for "${X}"; to pass null in FormData, you must use the string 'null'`);
  if (typeof J === "string" || typeof J === "number" || typeof J === "boolean") $.append(X, String(J));
  else if (J instanceof Response) {
    let Y = {}, W = J.headers.get("Content-Type");
    if (W) Y = { type: W };
    $.append(X, O1([await J.blob()], v8(J, Q), Y));
  } else if (y5(J)) $.append(X, O1([await new Response(OJ(J)).blob()], v8(J, Q)));
  else if (OM(J)) $.append(X, O1([J], v8(J, Q), { type: J.type }));
  else if (Array.isArray(J)) await Promise.all(J.map((Y) => x5($, X + "[]", Y, Q)));
  else if (typeof J === "object") await Promise.all(Object.entries(J).map(([Y, W]) => x5($, `${X}[${Y}]`, W, Q)));
  else throw TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${J} instead`);
};
var BK = ($) => $ != null && typeof $ === "object" && typeof $.size === "number" && typeof $.type === "string" && typeof $.text === "function" && typeof $.slice === "function" && typeof $.arrayBuffer === "function";
var wM = ($) => $ != null && typeof $ === "object" && typeof $.name === "string" && typeof $.lastModified === "number" && BK($);
var BM = ($) => $ != null && typeof $ === "object" && typeof $.url === "string" && typeof $.blob === "function";
async function jJ($, X, J) {
  if (T5(), $ = await $, X || (X = v8($, true)), wM($)) {
    if ($ instanceof File && X == null && J == null) return $;
    return O1([await $.arrayBuffer()], X ?? $.name, { type: $.type, lastModified: $.lastModified, ...J });
  }
  if (BM($)) {
    let Y = await $.blob();
    return X || (X = new URL($.url).pathname.split(/[\\/]/).pop()), O1(await f5(Y), X, J);
  }
  let Q = await f5($);
  if (!J?.type) {
    let Y = Q.find((W) => typeof W === "object" && "type" in W && W.type);
    if (typeof Y === "string") J = { ...J, type: Y };
  }
  return O1(Q, X, J);
}
async function f5($) {
  let X = [];
  if (typeof $ === "string" || ArrayBuffer.isView($) || $ instanceof ArrayBuffer) X.push($);
  else if (BK($)) X.push($ instanceof Blob ? $ : await $.arrayBuffer());
  else if (y5($)) for await (let J of $) X.push(...await f5(J));
  else {
    let J = $?.constructor?.name;
    throw Error(`Unexpected data type: ${typeof $}${J ? `; constructor: ${J}` : ""}${qM($)}`);
  }
  return X;
}
function qM($) {
  if (typeof $ !== "object" || $ === null) return "";
  return `; props: [${Object.getOwnPropertyNames($).map((J) => `"${J}"`).join(", ")}]`;
}
var b$ = class {
  constructor($) {
    this._client = $;
  }
};
var qK = Symbol.for("brand.privateNullableHeaders");
function* DM($) {
  if (!$) return;
  if (qK in $) {
    let { values: Q, nulls: Y } = $;
    yield* Q.entries();
    for (let W of Y) yield [W, null];
    return;
  }
  let X = false, J;
  if ($ instanceof Headers) J = $.entries();
  else if (R5($)) J = $;
  else X = true, J = Object.entries($ ?? {});
  for (let Q of J) {
    let Y = Q[0];
    if (typeof Y !== "string") throw TypeError("expected header name to be a string");
    let W = R5(Q[1]) ? Q[1] : [Q[1]], z = false;
    for (let G of W) {
      if (G === void 0) continue;
      if (X && !z) z = true, yield [Y, null];
      yield [Y, G];
    }
  }
}
var i = ($) => {
  let X = new Headers(), J = /* @__PURE__ */ new Set();
  for (let Q of $) {
    let Y = /* @__PURE__ */ new Set();
    for (let [W, z] of DM(Q)) {
      let G = W.toLowerCase();
      if (!Y.has(G)) X.delete(W), Y.add(G);
      if (z === null) X.delete(W), J.add(G);
      else X.append(W, z), J.delete(G);
    }
  }
  return { [qK]: true, values: X, nulls: J };
};
var C8 = Symbol("anthropic.sdk.stainlessHelper");
function FJ($) {
  return typeof $ === "object" && $ !== null && C8 in $;
}
function g5($, X) {
  let J = /* @__PURE__ */ new Set();
  if ($) {
    for (let Q of $) if (FJ(Q)) J.add(Q[C8]);
  }
  if (X) for (let Q of X) {
    if (FJ(Q)) J.add(Q[C8]);
    if (Array.isArray(Q.content)) {
      for (let Y of Q.content) if (FJ(Y)) J.add(Y[C8]);
    }
  }
  return Array.from(J);
}
function MJ($, X) {
  let J = g5($, X);
  if (J.length === 0) return {};
  return { "x-stainless-helper": J.join(", ") };
}
function LK($) {
  if (FJ($)) return { "x-stainless-helper": $[C8] };
  return {};
}
function jK($) {
  return $.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
var DK = Object.freeze(/* @__PURE__ */ Object.create(null));
var jM = ($ = jK) => function(J, ...Q) {
  if (J.length === 1) return J[0];
  let Y = false, W = [], z = J.reduce((K, V, N) => {
    if (/[?#]/.test(V)) Y = true;
    let O = Q[N], w = (Y ? encodeURIComponent : $)("" + O);
    if (N !== Q.length && (O == null || typeof O === "object" && O.toString === Object.getPrototypeOf(Object.getPrototypeOf(O.hasOwnProperty ?? DK) ?? DK)?.toString)) w = O + "", W.push({ start: K.length + V.length, length: w.length, error: `Value of type ${Object.prototype.toString.call(O).slice(8, -1)} is not a valid path parameter` });
    return K + V + (N === Q.length ? "" : w);
  }, ""), G = z.split(/[?#]/, 1)[0], U = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi, H;
  while ((H = U.exec(G)) !== null) W.push({ start: H.index, length: H[0].length, error: `Value "${H[0]}" can't be safely passed as a path parameter` });
  if (W.sort((K, V) => K.start - V.start), W.length > 0) {
    let K = 0, V = W.reduce((N, O) => {
      let w = " ".repeat(O.start - K), B = "^".repeat(O.length);
      return K = O.start + O.length, N + w + B;
    }, "");
    throw new y(`Path parameters result in path with invalid segments:
${W.map((N) => N.error).join(`
`)}
${z}
${V}`);
  }
  return z;
};
var M$ = jM(jK);
var k8 = class extends b$ {
  list($ = {}, X) {
    let { betas: J, ...Q } = $ ?? {};
    return this._client.getAPIList("/v1/files", k6, { query: Q, ...X, headers: i([{ "anthropic-beta": [...J ?? [], "files-api-2025-04-14"].toString() }, X?.headers]) });
  }
  delete($, X = {}, J) {
    let { betas: Q } = X ?? {};
    return this._client.delete(M$`/v1/files/${$}`, { ...J, headers: i([{ "anthropic-beta": [...Q ?? [], "files-api-2025-04-14"].toString() }, J?.headers]) });
  }
  download($, X = {}, J) {
    let { betas: Q } = X ?? {};
    return this._client.get(M$`/v1/files/${$}/content`, { ...J, headers: i([{ "anthropic-beta": [...Q ?? [], "files-api-2025-04-14"].toString(), Accept: "application/binary" }, J?.headers]), __binaryResponse: true });
  }
  retrieveMetadata($, X = {}, J) {
    let { betas: Q } = X ?? {};
    return this._client.get(M$`/v1/files/${$}`, { ...J, headers: i([{ "anthropic-beta": [...Q ?? [], "files-api-2025-04-14"].toString() }, J?.headers]) });
  }
  upload($, X) {
    let { betas: J, ...Q } = $;
    return this._client.post("/v1/files", e1({ body: Q, ...X, headers: i([{ "anthropic-beta": [...J ?? [], "files-api-2025-04-14"].toString() }, LK(Q.file), X?.headers]) }, this._client));
  }
};
var _8 = class extends b$ {
  retrieve($, X = {}, J) {
    let { betas: Q } = X ?? {};
    return this._client.get(M$`/v1/models/${$}?beta=true`, { ...J, headers: i([{ ...Q?.toString() != null ? { "anthropic-beta": Q?.toString() } : void 0 }, J?.headers]) });
  }
  list($ = {}, X) {
    let { betas: J, ...Q } = $ ?? {};
    return this._client.getAPIList("/v1/models?beta=true", k6, { query: Q, ...X, headers: i([{ ...J?.toString() != null ? { "anthropic-beta": J?.toString() } : void 0 }, X?.headers]) });
  }
};
var AJ = { "claude-opus-4-20250514": 8192, "claude-opus-4-0": 8192, "claude-4-opus-20250514": 8192, "anthropic.claude-opus-4-20250514-v1:0": 8192, "claude-opus-4@20250514": 8192, "claude-opus-4-1-20250805": 8192, "anthropic.claude-opus-4-1-20250805-v1:0": 8192, "claude-opus-4-1@20250805": 8192 };
function FK($) {
  return $?.output_format ?? $?.output_config?.format;
}
function h5($, X, J) {
  let Q = FK(X);
  if (!X || !("parse" in (Q ?? {}))) return { ...$, content: $.content.map((Y) => {
    if (Y.type === "text") {
      let W = Object.defineProperty({ ...Y }, "parsed_output", { value: null, enumerable: false });
      return Object.defineProperty(W, "parsed", { get() {
        return J.logger.warn("The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead."), null;
      }, enumerable: false });
    }
    return Y;
  }), parsed_output: null };
  return u5($, X, J);
}
function u5($, X, J) {
  let Q = null, Y = $.content.map((W) => {
    if (W.type === "text") {
      let z = AM(X, W.text);
      if (Q === null) Q = z;
      let G = Object.defineProperty({ ...W }, "parsed_output", { value: z, enumerable: false });
      return Object.defineProperty(G, "parsed", { get() {
        return J.logger.warn("The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead."), z;
      }, enumerable: false });
    }
    return W;
  });
  return { ...$, content: Y, parsed_output: Q };
}
function AM($, X) {
  let J = FK($);
  if (J?.type !== "json_schema") return null;
  try {
    if ("parse" in J) return J.parse(X);
    return JSON.parse(X);
  } catch (Q) {
    throw new y(`Failed to parse structured output: ${Q}`);
  }
}
var IM = ($) => {
  let X = 0, J = [];
  while (X < $.length) {
    let Q = $[X];
    if (Q === "\\") {
      X++;
      continue;
    }
    if (Q === "{") {
      J.push({ type: "brace", value: "{" }), X++;
      continue;
    }
    if (Q === "}") {
      J.push({ type: "brace", value: "}" }), X++;
      continue;
    }
    if (Q === "[") {
      J.push({ type: "paren", value: "[" }), X++;
      continue;
    }
    if (Q === "]") {
      J.push({ type: "paren", value: "]" }), X++;
      continue;
    }
    if (Q === ":") {
      J.push({ type: "separator", value: ":" }), X++;
      continue;
    }
    if (Q === ",") {
      J.push({ type: "delimiter", value: "," }), X++;
      continue;
    }
    if (Q === '"') {
      let G = "", U = false;
      Q = $[++X];
      while (Q !== '"') {
        if (X === $.length) {
          U = true;
          break;
        }
        if (Q === "\\") {
          if (X++, X === $.length) {
            U = true;
            break;
          }
          G += Q + $[X], Q = $[++X];
        } else G += Q, Q = $[++X];
      }
      if (Q = $[++X], !U) J.push({ type: "string", value: G });
      continue;
    }
    if (Q && /\s/.test(Q)) {
      X++;
      continue;
    }
    let W = /[0-9]/;
    if (Q && W.test(Q) || Q === "-" || Q === ".") {
      let G = "";
      if (Q === "-") G += Q, Q = $[++X];
      while (Q && W.test(Q) || Q === ".") G += Q, Q = $[++X];
      J.push({ type: "number", value: G });
      continue;
    }
    let z = /[a-z]/i;
    if (Q && z.test(Q)) {
      let G = "";
      while (Q && z.test(Q)) {
        if (X === $.length) break;
        G += Q, Q = $[++X];
      }
      if (G == "true" || G == "false" || G === "null") J.push({ type: "name", value: G });
      else {
        X++;
        continue;
      }
      continue;
    }
    X++;
  }
  return J;
};
var $0 = ($) => {
  if ($.length === 0) return $;
  let X = $[$.length - 1];
  switch (X.type) {
    case "separator":
      return $ = $.slice(0, $.length - 1), $0($);
      break;
    case "number":
      let J = X.value[X.value.length - 1];
      if (J === "." || J === "-") return $ = $.slice(0, $.length - 1), $0($);
    case "string":
      let Q = $[$.length - 2];
      if (Q?.type === "delimiter") return $ = $.slice(0, $.length - 1), $0($);
      else if (Q?.type === "brace" && Q.value === "{") return $ = $.slice(0, $.length - 1), $0($);
      break;
    case "delimiter":
      return $ = $.slice(0, $.length - 1), $0($);
      break;
  }
  return $;
};
var bM = ($) => {
  let X = [];
  if ($.map((J) => {
    if (J.type === "brace") if (J.value === "{") X.push("}");
    else X.splice(X.lastIndexOf("}"), 1);
    if (J.type === "paren") if (J.value === "[") X.push("]");
    else X.splice(X.lastIndexOf("]"), 1);
  }), X.length > 0) X.reverse().map((J) => {
    if (J === "}") $.push({ type: "brace", value: "}" });
    else if (J === "]") $.push({ type: "paren", value: "]" });
  });
  return $;
};
var ZM = ($) => {
  let X = "";
  return $.map((J) => {
    switch (J.type) {
      case "string":
        X += '"' + J.value + '"';
        break;
      default:
        X += J.value;
        break;
    }
  }), X;
};
var IJ = ($) => JSON.parse(ZM(bM($0(IM($)))));
var M6;
var _4;
var X0;
var x8;
var bJ;
var T8;
var y8;
var ZJ;
var f8;
var U4;
var g8;
var PJ;
var RJ;
var w1;
var EJ;
var SJ;
var h8;
var m5;
var MK;
var vJ;
var l5;
var c5;
var p5;
var AK;
var IK = "__json_buf";
function bK($) {
  return $.type === "tool_use" || $.type === "server_tool_use" || $.type === "mcp_tool_use";
}
var u8 = class _u8 {
  constructor($, X) {
    M6.add(this), this.messages = [], this.receivedMessages = [], _4.set(this, void 0), X0.set(this, null), this.controller = new AbortController(), x8.set(this, void 0), bJ.set(this, () => {
    }), T8.set(this, () => {
    }), y8.set(this, void 0), ZJ.set(this, () => {
    }), f8.set(this, () => {
    }), U4.set(this, {}), g8.set(this, false), PJ.set(this, false), RJ.set(this, false), w1.set(this, false), EJ.set(this, void 0), SJ.set(this, void 0), h8.set(this, void 0), vJ.set(this, (J) => {
      if (v(this, PJ, true, "f"), z4(J)) J = new g$();
      if (J instanceof g$) return v(this, RJ, true, "f"), this._emit("abort", J);
      if (J instanceof y) return this._emit("error", J);
      if (J instanceof Error) {
        let Q = new y(J.message);
        return Q.cause = J, this._emit("error", Q);
      }
      return this._emit("error", new y(String(J)));
    }), v(this, x8, new Promise((J, Q) => {
      v(this, bJ, J, "f"), v(this, T8, Q, "f");
    }), "f"), v(this, y8, new Promise((J, Q) => {
      v(this, ZJ, J, "f"), v(this, f8, Q, "f");
    }), "f"), L(this, x8, "f").catch(() => {
    }), L(this, y8, "f").catch(() => {
    }), v(this, X0, $, "f"), v(this, h8, X?.logger ?? console, "f");
  }
  get response() {
    return L(this, EJ, "f");
  }
  get request_id() {
    return L(this, SJ, "f");
  }
  async withResponse() {
    v(this, w1, true, "f");
    let $ = await L(this, x8, "f");
    if (!$) throw Error("Could not resolve a `Response` object");
    return { data: this, response: $, request_id: $.headers.get("request-id") };
  }
  static fromReadableStream($) {
    let X = new _u8(null);
    return X._run(() => X._fromReadableStream($)), X;
  }
  static createMessage($, X, J, { logger: Q } = {}) {
    let Y = new _u8(X, { logger: Q });
    for (let W of X.messages) Y._addMessageParam(W);
    return v(Y, X0, { ...X, stream: true }, "f"), Y._run(() => Y._createMessage($, { ...X, stream: true }, { ...J, headers: { ...J?.headers, "X-Stainless-Helper-Method": "stream" } })), Y;
  }
  _run($) {
    $().then(() => {
      this._emitFinal(), this._emit("end");
    }, L(this, vJ, "f"));
  }
  _addMessageParam($) {
    this.messages.push($);
  }
  _addMessage($, X = true) {
    if (this.receivedMessages.push($), X) this._emit("message", $);
  }
  async _createMessage($, X, J) {
    let Q = J?.signal, Y;
    if (Q) {
      if (Q.aborted) this.controller.abort();
      Y = this.controller.abort.bind(this.controller), Q.addEventListener("abort", Y);
    }
    try {
      L(this, M6, "m", l5).call(this);
      let { response: W, data: z } = await $.create({ ...X, stream: true }, { ...J, signal: this.controller.signal }).withResponse();
      this._connected(W);
      for await (let G of z) L(this, M6, "m", c5).call(this, G);
      if (z.controller.signal?.aborted) throw new g$();
      L(this, M6, "m", p5).call(this);
    } finally {
      if (Q && Y) Q.removeEventListener("abort", Y);
    }
  }
  _connected($) {
    if (this.ended) return;
    v(this, EJ, $, "f"), v(this, SJ, $?.headers.get("request-id"), "f"), L(this, bJ, "f").call(this, $), this._emit("connect");
  }
  get ended() {
    return L(this, g8, "f");
  }
  get errored() {
    return L(this, PJ, "f");
  }
  get aborted() {
    return L(this, RJ, "f");
  }
  abort() {
    this.controller.abort();
  }
  on($, X) {
    return (L(this, U4, "f")[$] || (L(this, U4, "f")[$] = [])).push({ listener: X }), this;
  }
  off($, X) {
    let J = L(this, U4, "f")[$];
    if (!J) return this;
    let Q = J.findIndex((Y) => Y.listener === X);
    if (Q >= 0) J.splice(Q, 1);
    return this;
  }
  once($, X) {
    return (L(this, U4, "f")[$] || (L(this, U4, "f")[$] = [])).push({ listener: X, once: true }), this;
  }
  emitted($) {
    return new Promise((X, J) => {
      if (v(this, w1, true, "f"), $ !== "error") this.once("error", J);
      this.once($, X);
    });
  }
  async done() {
    v(this, w1, true, "f"), await L(this, y8, "f");
  }
  get currentMessage() {
    return L(this, _4, "f");
  }
  async finalMessage() {
    return await this.done(), L(this, M6, "m", m5).call(this);
  }
  async finalText() {
    return await this.done(), L(this, M6, "m", MK).call(this);
  }
  _emit($, ...X) {
    if (L(this, g8, "f")) return;
    if ($ === "end") v(this, g8, true, "f"), L(this, ZJ, "f").call(this);
    let J = L(this, U4, "f")[$];
    if (J) L(this, U4, "f")[$] = J.filter((Q) => !Q.once), J.forEach(({ listener: Q }) => Q(...X));
    if ($ === "abort") {
      let Q = X[0];
      if (!L(this, w1, "f") && !J?.length) Promise.reject(Q);
      L(this, T8, "f").call(this, Q), L(this, f8, "f").call(this, Q), this._emit("end");
      return;
    }
    if ($ === "error") {
      let Q = X[0];
      if (!L(this, w1, "f") && !J?.length) Promise.reject(Q);
      L(this, T8, "f").call(this, Q), L(this, f8, "f").call(this, Q), this._emit("end");
    }
  }
  _emitFinal() {
    if (this.receivedMessages.at(-1)) this._emit("finalMessage", L(this, M6, "m", m5).call(this));
  }
  async _fromReadableStream($, X) {
    let J = X?.signal, Q;
    if (J) {
      if (J.aborted) this.controller.abort();
      Q = this.controller.abort.bind(this.controller), J.addEventListener("abort", Q);
    }
    try {
      L(this, M6, "m", l5).call(this), this._connected(null);
      let Y = B6.fromReadableStream($, this.controller);
      for await (let W of Y) L(this, M6, "m", c5).call(this, W);
      if (Y.controller.signal?.aborted) throw new g$();
      L(this, M6, "m", p5).call(this);
    } finally {
      if (J && Q) J.removeEventListener("abort", Q);
    }
  }
  [(_4 = /* @__PURE__ */ new WeakMap(), X0 = /* @__PURE__ */ new WeakMap(), x8 = /* @__PURE__ */ new WeakMap(), bJ = /* @__PURE__ */ new WeakMap(), T8 = /* @__PURE__ */ new WeakMap(), y8 = /* @__PURE__ */ new WeakMap(), ZJ = /* @__PURE__ */ new WeakMap(), f8 = /* @__PURE__ */ new WeakMap(), U4 = /* @__PURE__ */ new WeakMap(), g8 = /* @__PURE__ */ new WeakMap(), PJ = /* @__PURE__ */ new WeakMap(), RJ = /* @__PURE__ */ new WeakMap(), w1 = /* @__PURE__ */ new WeakMap(), EJ = /* @__PURE__ */ new WeakMap(), SJ = /* @__PURE__ */ new WeakMap(), h8 = /* @__PURE__ */ new WeakMap(), vJ = /* @__PURE__ */ new WeakMap(), M6 = /* @__PURE__ */ new WeakSet(), m5 = function() {
    if (this.receivedMessages.length === 0) throw new y("stream ended without producing a Message with role=assistant");
    return this.receivedMessages.at(-1);
  }, MK = function() {
    if (this.receivedMessages.length === 0) throw new y("stream ended without producing a Message with role=assistant");
    let X = this.receivedMessages.at(-1).content.filter((J) => J.type === "text").map((J) => J.text);
    if (X.length === 0) throw new y("stream ended without producing a content block with type=text");
    return X.join(" ");
  }, l5 = function() {
    if (this.ended) return;
    v(this, _4, void 0, "f");
  }, c5 = function(X) {
    if (this.ended) return;
    let J = L(this, M6, "m", AK).call(this, X);
    switch (this._emit("streamEvent", X, J), X.type) {
      case "content_block_delta": {
        let Q = J.content.at(-1);
        switch (X.delta.type) {
          case "text_delta": {
            if (Q.type === "text") this._emit("text", X.delta.text, Q.text || "");
            break;
          }
          case "citations_delta": {
            if (Q.type === "text") this._emit("citation", X.delta.citation, Q.citations ?? []);
            break;
          }
          case "input_json_delta": {
            if (bK(Q) && Q.input) this._emit("inputJson", X.delta.partial_json, Q.input);
            break;
          }
          case "thinking_delta": {
            if (Q.type === "thinking") this._emit("thinking", X.delta.thinking, Q.thinking);
            break;
          }
          case "signature_delta": {
            if (Q.type === "thinking") this._emit("signature", Q.signature);
            break;
          }
          case "compaction_delta": {
            if (Q.type === "compaction" && Q.content) this._emit("compaction", Q.content);
            break;
          }
          default:
            ZK(X.delta);
        }
        break;
      }
      case "message_stop": {
        this._addMessageParam(J), this._addMessage(h5(J, L(this, X0, "f"), { logger: L(this, h8, "f") }), true);
        break;
      }
      case "content_block_stop": {
        this._emit("contentBlock", J.content.at(-1));
        break;
      }
      case "message_start": {
        v(this, _4, J, "f");
        break;
      }
      case "content_block_start":
      case "message_delta":
        break;
    }
  }, p5 = function() {
    if (this.ended) throw new y("stream has ended, this shouldn't happen");
    let X = L(this, _4, "f");
    if (!X) throw new y("request ended without sending any chunks");
    return v(this, _4, void 0, "f"), h5(X, L(this, X0, "f"), { logger: L(this, h8, "f") });
  }, AK = function(X) {
    let J = L(this, _4, "f");
    if (X.type === "message_start") {
      if (J) throw new y(`Unexpected event order, got ${X.type} before receiving "message_stop"`);
      return X.message;
    }
    if (!J) throw new y(`Unexpected event order, got ${X.type} before "message_start"`);
    switch (X.type) {
      case "message_stop":
        return J;
      case "message_delta":
        if (J.container = X.delta.container, J.stop_reason = X.delta.stop_reason, J.stop_sequence = X.delta.stop_sequence, J.usage.output_tokens = X.usage.output_tokens, J.context_management = X.context_management, X.usage.input_tokens != null) J.usage.input_tokens = X.usage.input_tokens;
        if (X.usage.cache_creation_input_tokens != null) J.usage.cache_creation_input_tokens = X.usage.cache_creation_input_tokens;
        if (X.usage.cache_read_input_tokens != null) J.usage.cache_read_input_tokens = X.usage.cache_read_input_tokens;
        if (X.usage.server_tool_use != null) J.usage.server_tool_use = X.usage.server_tool_use;
        if (X.usage.iterations != null) J.usage.iterations = X.usage.iterations;
        return J;
      case "content_block_start":
        return J.content.push(X.content_block), J;
      case "content_block_delta": {
        let Q = J.content.at(X.index);
        switch (X.delta.type) {
          case "text_delta": {
            if (Q?.type === "text") J.content[X.index] = { ...Q, text: (Q.text || "") + X.delta.text };
            break;
          }
          case "citations_delta": {
            if (Q?.type === "text") J.content[X.index] = { ...Q, citations: [...Q.citations ?? [], X.delta.citation] };
            break;
          }
          case "input_json_delta": {
            if (Q && bK(Q)) {
              let Y = Q[IK] || "";
              Y += X.delta.partial_json;
              let W = { ...Q };
              if (Object.defineProperty(W, IK, { value: Y, enumerable: false, writable: true }), Y) try {
                W.input = IJ(Y);
              } catch (z) {
                let G = new y(`Unable to parse tool parameter JSON from model. Please retry your request or adjust your prompt. Error: ${z}. JSON: ${Y}`);
                L(this, vJ, "f").call(this, G);
              }
              J.content[X.index] = W;
            }
            break;
          }
          case "thinking_delta": {
            if (Q?.type === "thinking") J.content[X.index] = { ...Q, thinking: Q.thinking + X.delta.thinking };
            break;
          }
          case "signature_delta": {
            if (Q?.type === "thinking") J.content[X.index] = { ...Q, signature: X.delta.signature };
            break;
          }
          case "compaction_delta": {
            if (Q?.type === "compaction") J.content[X.index] = { ...Q, content: (Q.content || "") + X.delta.content };
            break;
          }
          default:
            ZK(X.delta);
        }
        return J;
      }
      case "content_block_stop":
        return J;
    }
  }, Symbol.asyncIterator)]() {
    let $ = [], X = [], J = false;
    return this.on("streamEvent", (Q) => {
      let Y = X.shift();
      if (Y) Y.resolve(Q);
      else $.push(Q);
    }), this.on("end", () => {
      J = true;
      for (let Q of X) Q.resolve(void 0);
      X.length = 0;
    }), this.on("abort", (Q) => {
      J = true;
      for (let Y of X) Y.reject(Q);
      X.length = 0;
    }), this.on("error", (Q) => {
      J = true;
      for (let Y of X) Y.reject(Q);
      X.length = 0;
    }), { next: async () => {
      if (!$.length) {
        if (J) return { value: void 0, done: true };
        return new Promise((Y, W) => X.push({ resolve: Y, reject: W })).then((Y) => Y ? { value: Y, done: false } : { value: void 0, done: true });
      }
      return { value: $.shift(), done: false };
    }, return: async () => {
      return this.abort(), { value: void 0, done: true };
    } };
  }
  toReadableStream() {
    return new B6(this[Symbol.asyncIterator].bind(this), this.controller).toReadableStream();
  }
};
function ZK($) {
}
var J0 = class extends Error {
  constructor($) {
    let X = typeof $ === "string" ? $ : $.map((J) => {
      if (J.type === "text") return J.text;
      return `[${J.type}]`;
    }).join(" ");
    super(X);
    this.name = "ToolError", this.content = $;
  }
};
var PK = 1e5;
var RK = `You have been working on the task described above but have not yet completed it. Write a continuation summary that will allow you (or another instance of yourself) to resume work efficiently in a future context window where the conversation history will be replaced with this summary. Your summary should be structured, concise, and actionable. Include:
1. Task Overview
The user's core request and success criteria
Any clarifications or constraints they specified
2. Current State
What has been completed so far
Files created, modified, or analyzed (with paths if relevant)
Key outputs or artifacts produced
3. Important Discoveries
Technical constraints or requirements uncovered
Decisions made and their rationale
Errors encountered and how they were resolved
What approaches were tried that didn't work (and why)
4. Next Steps
Specific actions needed to complete the task
Any blockers or open questions to resolve
Priority order if multiple steps remain
5. Context to Preserve
User preferences or style requirements
Domain-specific details that aren't obvious
Any promises made to the user
Be concise but complete\u2014err on the side of including information that would prevent duplicate work or repeated mistakes. Write in a way that enables immediate resumption of the task.
Wrap your summary in <summary></summary> tags.`;
var m8;
var Y0;
var B1;
var k$;
var l8;
var q6;
var H4;
var x4;
var c8;
var EK;
var d5;
function SK() {
  let $, X;
  return { promise: new Promise((Q, Y) => {
    $ = Q, X = Y;
  }), resolve: $, reject: X };
}
var p8 = class {
  constructor($, X, J) {
    m8.add(this), this.client = $, Y0.set(this, false), B1.set(this, false), k$.set(this, void 0), l8.set(this, void 0), q6.set(this, void 0), H4.set(this, void 0), x4.set(this, void 0), c8.set(this, 0), v(this, k$, { params: { ...X, messages: structuredClone(X.messages) } }, "f");
    let Y = ["BetaToolRunner", ...g5(X.tools, X.messages)].join(", ");
    v(this, l8, { ...J, headers: i([{ "x-stainless-helper": Y }, J?.headers]) }, "f"), v(this, x4, SK(), "f");
  }
  async *[(Y0 = /* @__PURE__ */ new WeakMap(), B1 = /* @__PURE__ */ new WeakMap(), k$ = /* @__PURE__ */ new WeakMap(), l8 = /* @__PURE__ */ new WeakMap(), q6 = /* @__PURE__ */ new WeakMap(), H4 = /* @__PURE__ */ new WeakMap(), x4 = /* @__PURE__ */ new WeakMap(), c8 = /* @__PURE__ */ new WeakMap(), m8 = /* @__PURE__ */ new WeakSet(), EK = async function() {
    let X = L(this, k$, "f").params.compactionControl;
    if (!X || !X.enabled) return false;
    let J = 0;
    if (L(this, q6, "f") !== void 0) try {
      let U = await L(this, q6, "f");
      J = U.usage.input_tokens + (U.usage.cache_creation_input_tokens ?? 0) + (U.usage.cache_read_input_tokens ?? 0) + U.usage.output_tokens;
    } catch {
      return false;
    }
    let Q = X.contextTokenThreshold ?? PK;
    if (J < Q) return false;
    let Y = X.model ?? L(this, k$, "f").params.model, W = X.summaryPrompt ?? RK, z = L(this, k$, "f").params.messages;
    if (z[z.length - 1].role === "assistant") {
      let U = z[z.length - 1];
      if (Array.isArray(U.content)) {
        let H = U.content.filter((K) => K.type !== "tool_use");
        if (H.length === 0) z.pop();
        else U.content = H;
      }
    }
    let G = await this.client.beta.messages.create({ model: Y, messages: [...z, { role: "user", content: [{ type: "text", text: W }] }], max_tokens: L(this, k$, "f").params.max_tokens }, { headers: { "x-stainless-helper": "compaction" } });
    if (G.content[0]?.type !== "text") throw new y("Expected text response for compaction");
    return L(this, k$, "f").params.messages = [{ role: "user", content: G.content }], true;
  }, Symbol.asyncIterator)]() {
    var $;
    if (L(this, Y0, "f")) throw new y("Cannot iterate over a consumed stream");
    v(this, Y0, true, "f"), v(this, B1, true, "f"), v(this, H4, void 0, "f");
    try {
      while (true) {
        let X;
        try {
          if (L(this, k$, "f").params.max_iterations && L(this, c8, "f") >= L(this, k$, "f").params.max_iterations) break;
          v(this, B1, false, "f"), v(this, H4, void 0, "f"), v(this, c8, ($ = L(this, c8, "f"), $++, $), "f"), v(this, q6, void 0, "f");
          let { max_iterations: J, compactionControl: Q, ...Y } = L(this, k$, "f").params;
          if (Y.stream) X = this.client.beta.messages.stream({ ...Y }, L(this, l8, "f")), v(this, q6, X.finalMessage(), "f"), L(this, q6, "f").catch(() => {
          }), yield X;
          else v(this, q6, this.client.beta.messages.create({ ...Y, stream: false }, L(this, l8, "f")), "f"), yield L(this, q6, "f");
          if (!await L(this, m8, "m", EK).call(this)) {
            if (!L(this, B1, "f")) {
              let { role: G, content: U } = await L(this, q6, "f");
              L(this, k$, "f").params.messages.push({ role: G, content: U });
            }
            let z = await L(this, m8, "m", d5).call(this, L(this, k$, "f").params.messages.at(-1));
            if (z) L(this, k$, "f").params.messages.push(z);
            else if (!L(this, B1, "f")) break;
          }
        } finally {
          if (X) X.abort();
        }
      }
      if (!L(this, q6, "f")) throw new y("ToolRunner concluded without a message from the server");
      L(this, x4, "f").resolve(await L(this, q6, "f"));
    } catch (X) {
      throw v(this, Y0, false, "f"), L(this, x4, "f").promise.catch(() => {
      }), L(this, x4, "f").reject(X), v(this, x4, SK(), "f"), X;
    }
  }
  setMessagesParams($) {
    if (typeof $ === "function") L(this, k$, "f").params = $(L(this, k$, "f").params);
    else L(this, k$, "f").params = $;
    v(this, B1, true, "f"), v(this, H4, void 0, "f");
  }
  async generateToolResponse() {
    let $ = await L(this, q6, "f") ?? this.params.messages.at(-1);
    if (!$) return null;
    return L(this, m8, "m", d5).call(this, $);
  }
  done() {
    return L(this, x4, "f").promise;
  }
  async runUntilDone() {
    if (!L(this, Y0, "f")) for await (let $ of this) ;
    return this.done();
  }
  get params() {
    return L(this, k$, "f").params;
  }
  pushMessages(...$) {
    this.setMessagesParams((X) => ({ ...X, messages: [...X.messages, ...$] }));
  }
  then($, X) {
    return this.runUntilDone().then($, X);
  }
};
d5 = async function(X) {
  if (L(this, H4, "f") !== void 0) return L(this, H4, "f");
  return v(this, H4, PM(L(this, k$, "f").params, X), "f"), L(this, H4, "f");
};
async function PM($, X = $.messages.at(-1)) {
  if (!X || X.role !== "assistant" || !X.content || typeof X.content === "string") return null;
  let J = X.content.filter((Y) => Y.type === "tool_use");
  if (J.length === 0) return null;
  return { role: "user", content: await Promise.all(J.map(async (Y) => {
    let W = $.tools.find((z) => ("name" in z ? z.name : z.mcp_server_name) === Y.name);
    if (!W || !("run" in W)) return { type: "tool_result", tool_use_id: Y.id, content: `Error: Tool '${Y.name}' not found`, is_error: true };
    try {
      let z = Y.input;
      if ("parse" in W && W.parse) z = W.parse(z);
      let G = await W.run(z);
      return { type: "tool_result", tool_use_id: Y.id, content: G };
    } catch (z) {
      return { type: "tool_result", tool_use_id: Y.id, content: z instanceof J0 ? z.content : `Error: ${z instanceof Error ? z.message : String(z)}`, is_error: true };
    }
  })) };
}
var Q0 = class _Q0 {
  constructor($, X) {
    this.iterator = $, this.controller = X;
  }
  async *decoder() {
    let $ = new k4();
    for await (let X of this.iterator) for (let J of $.decode(X)) yield JSON.parse(J);
    for (let X of $.flush()) yield JSON.parse(X);
  }
  [Symbol.asyncIterator]() {
    return this.decoder();
  }
  static fromResponse($, X) {
    if (!$.body) {
      if (X.abort(), typeof globalThis.navigator < "u" && globalThis.navigator.product === "ReactNative") throw new y("The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api");
      throw new y("Attempted to iterate over a response with no body");
    }
    return new _Q0(b8($.body), X);
  }
};
var d8 = class extends b$ {
  create($, X) {
    let { betas: J, ...Q } = $;
    return this._client.post("/v1/messages/batches?beta=true", { body: Q, ...X, headers: i([{ "anthropic-beta": [...J ?? [], "message-batches-2024-09-24"].toString() }, X?.headers]) });
  }
  retrieve($, X = {}, J) {
    let { betas: Q } = X ?? {};
    return this._client.get(M$`/v1/messages/batches/${$}?beta=true`, { ...J, headers: i([{ "anthropic-beta": [...Q ?? [], "message-batches-2024-09-24"].toString() }, J?.headers]) });
  }
  list($ = {}, X) {
    let { betas: J, ...Q } = $ ?? {};
    return this._client.getAPIList("/v1/messages/batches?beta=true", k6, { query: Q, ...X, headers: i([{ "anthropic-beta": [...J ?? [], "message-batches-2024-09-24"].toString() }, X?.headers]) });
  }
  delete($, X = {}, J) {
    let { betas: Q } = X ?? {};
    return this._client.delete(M$`/v1/messages/batches/${$}?beta=true`, { ...J, headers: i([{ "anthropic-beta": [...Q ?? [], "message-batches-2024-09-24"].toString() }, J?.headers]) });
  }
  cancel($, X = {}, J) {
    let { betas: Q } = X ?? {};
    return this._client.post(M$`/v1/messages/batches/${$}/cancel?beta=true`, { ...J, headers: i([{ "anthropic-beta": [...Q ?? [], "message-batches-2024-09-24"].toString() }, J?.headers]) });
  }
  async results($, X = {}, J) {
    let Q = await this.retrieve($);
    if (!Q.results_url) throw new y(`No batch \`results_url\`; Has it finished processing? ${Q.processing_status} - ${Q.id}`);
    let { betas: Y } = X ?? {};
    return this._client.get(Q.results_url, { ...J, headers: i([{ "anthropic-beta": [...Y ?? [], "message-batches-2024-09-24"].toString(), Accept: "application/binary" }, J?.headers]), stream: true, __binaryResponse: true })._thenUnwrap((W, z) => Q0.fromResponse(z.response, z.controller));
  }
};
var vK = { "claude-1.3": "November 6th, 2024", "claude-1.3-100k": "November 6th, 2024", "claude-instant-1.1": "November 6th, 2024", "claude-instant-1.1-100k": "November 6th, 2024", "claude-instant-1.2": "November 6th, 2024", "claude-3-sonnet-20240229": "July 21st, 2025", "claude-3-opus-20240229": "January 5th, 2026", "claude-2.1": "July 21st, 2025", "claude-2.0": "July 21st, 2025", "claude-3-7-sonnet-latest": "February 19th, 2026", "claude-3-7-sonnet-20250219": "February 19th, 2026" };
var EM = ["claude-opus-4-6"];
var T4 = class extends b$ {
  constructor() {
    super(...arguments);
    this.batches = new d8(this._client);
  }
  create($, X) {
    let J = CK($), { betas: Q, ...Y } = J;
    if (Y.model in vK) console.warn(`The model '${Y.model}' is deprecated and will reach end-of-life on ${vK[Y.model]}
Please migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
    if (Y.model in EM && Y.thinking && Y.thinking.type === "enabled") console.warn(`Using Claude with ${Y.model} and 'thinking.type=enabled' is deprecated. Use 'thinking.type=adaptive' instead which results in better model performance in our testing: https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking`);
    let W = this._client._options.timeout;
    if (!Y.stream && W == null) {
      let G = AJ[Y.model] ?? void 0;
      W = this._client.calculateNonstreamingTimeout(Y.max_tokens, G);
    }
    let z = MJ(Y.tools, Y.messages);
    return this._client.post("/v1/messages?beta=true", { body: Y, timeout: W ?? 6e5, ...X, headers: i([{ ...Q?.toString() != null ? { "anthropic-beta": Q?.toString() } : void 0 }, z, X?.headers]), stream: J.stream ?? false });
  }
  parse($, X) {
    return X = { ...X, headers: i([{ "anthropic-beta": [...$.betas ?? [], "structured-outputs-2025-12-15"].toString() }, X?.headers]) }, this.create($, X).then((J) => u5(J, $, { logger: this._client.logger ?? console }));
  }
  stream($, X) {
    return u8.createMessage(this, $, X);
  }
  countTokens($, X) {
    let J = CK($), { betas: Q, ...Y } = J;
    return this._client.post("/v1/messages/count_tokens?beta=true", { body: Y, ...X, headers: i([{ "anthropic-beta": [...Q ?? [], "token-counting-2024-11-01"].toString() }, X?.headers]) });
  }
  toolRunner($, X) {
    return new p8(this._client, $, X);
  }
};
function CK($) {
  if (!$.output_format) return $;
  if ($.output_config?.format) throw new y("Both output_format and output_config.format were provided. Please use only output_config.format (output_format is deprecated).");
  let { output_format: X, ...J } = $;
  return { ...J, output_config: { ...$.output_config, format: X } };
}
T4.Batches = d8;
T4.BetaToolRunner = p8;
T4.ToolError = J0;
var i8 = class extends b$ {
  create($, X = {}, J) {
    let { betas: Q, ...Y } = X ?? {};
    return this._client.post(M$`/v1/skills/${$}/versions?beta=true`, e1({ body: Y, ...J, headers: i([{ "anthropic-beta": [...Q ?? [], "skills-2025-10-02"].toString() }, J?.headers]) }, this._client));
  }
  retrieve($, X, J) {
    let { skill_id: Q, betas: Y } = X;
    return this._client.get(M$`/v1/skills/${Q}/versions/${$}?beta=true`, { ...J, headers: i([{ "anthropic-beta": [...Y ?? [], "skills-2025-10-02"].toString() }, J?.headers]) });
  }
  list($, X = {}, J) {
    let { betas: Q, ...Y } = X ?? {};
    return this._client.getAPIList(M$`/v1/skills/${$}/versions?beta=true`, S8, { query: Y, ...J, headers: i([{ "anthropic-beta": [...Q ?? [], "skills-2025-10-02"].toString() }, J?.headers]) });
  }
  delete($, X, J) {
    let { skill_id: Q, betas: Y } = X;
    return this._client.delete(M$`/v1/skills/${Q}/versions/${$}?beta=true`, { ...J, headers: i([{ "anthropic-beta": [...Y ?? [], "skills-2025-10-02"].toString() }, J?.headers]) });
  }
};
var W0 = class extends b$ {
  constructor() {
    super(...arguments);
    this.versions = new i8(this._client);
  }
  create($ = {}, X) {
    let { betas: J, ...Q } = $ ?? {};
    return this._client.post("/v1/skills?beta=true", e1({ body: Q, ...X, headers: i([{ "anthropic-beta": [...J ?? [], "skills-2025-10-02"].toString() }, X?.headers]) }, this._client, false));
  }
  retrieve($, X = {}, J) {
    let { betas: Q } = X ?? {};
    return this._client.get(M$`/v1/skills/${$}?beta=true`, { ...J, headers: i([{ "anthropic-beta": [...Q ?? [], "skills-2025-10-02"].toString() }, J?.headers]) });
  }
  list($ = {}, X) {
    let { betas: J, ...Q } = $ ?? {};
    return this._client.getAPIList("/v1/skills?beta=true", S8, { query: Q, ...X, headers: i([{ "anthropic-beta": [...J ?? [], "skills-2025-10-02"].toString() }, X?.headers]) });
  }
  delete($, X = {}, J) {
    let { betas: Q } = X ?? {};
    return this._client.delete(M$`/v1/skills/${$}?beta=true`, { ...J, headers: i([{ "anthropic-beta": [...Q ?? [], "skills-2025-10-02"].toString() }, J?.headers]) });
  }
};
W0.Versions = i8;
var r6 = class extends b$ {
  constructor() {
    super(...arguments);
    this.models = new _8(this._client), this.messages = new T4(this._client), this.files = new k8(this._client), this.skills = new W0(this._client);
  }
};
r6.Models = _8;
r6.Messages = T4;
r6.Files = k8;
r6.Skills = W0;
var z0 = class extends b$ {
  create($, X) {
    let { betas: J, ...Q } = $;
    return this._client.post("/v1/complete", { body: Q, timeout: this._client._options.timeout ?? 6e5, ...X, headers: i([{ ...J?.toString() != null ? { "anthropic-beta": J?.toString() } : void 0 }, X?.headers]), stream: $.stream ?? false });
  }
};
function kK($) {
  return $?.output_config?.format;
}
function i5($, X, J) {
  let Q = kK(X);
  if (!X || !("parse" in (Q ?? {}))) return { ...$, content: $.content.map((Y) => {
    if (Y.type === "text") return Object.defineProperty({ ...Y }, "parsed_output", { value: null, enumerable: false });
    return Y;
  }), parsed_output: null };
  return n5($, X, J);
}
function n5($, X, J) {
  let Q = null, Y = $.content.map((W) => {
    if (W.type === "text") {
      let z = kM(X, W.text);
      if (Q === null) Q = z;
      return Object.defineProperty({ ...W }, "parsed_output", { value: z, enumerable: false });
    }
    return W;
  });
  return { ...$, content: Y, parsed_output: Q };
}
function kM($, X) {
  let J = kK($);
  if (J?.type !== "json_schema") return null;
  try {
    if ("parse" in J) return J.parse(X);
    return JSON.parse(X);
  } catch (Q) {
    throw new y(`Failed to parse structured output: ${Q}`);
  }
}
var A6;
var y4;
var G0;
var n8;
var CJ;
var r8;
var o8;
var kJ;
var t8;
var K4;
var a8;
var _J;
var xJ;
var q1;
var TJ;
var yJ;
var s8;
var r5;
var _K;
var o5;
var t5;
var a5;
var s5;
var xK;
var TK = "__json_buf";
function yK($) {
  return $.type === "tool_use" || $.type === "server_tool_use";
}
var e8 = class _e8 {
  constructor($, X) {
    A6.add(this), this.messages = [], this.receivedMessages = [], y4.set(this, void 0), G0.set(this, null), this.controller = new AbortController(), n8.set(this, void 0), CJ.set(this, () => {
    }), r8.set(this, () => {
    }), o8.set(this, void 0), kJ.set(this, () => {
    }), t8.set(this, () => {
    }), K4.set(this, {}), a8.set(this, false), _J.set(this, false), xJ.set(this, false), q1.set(this, false), TJ.set(this, void 0), yJ.set(this, void 0), s8.set(this, void 0), o5.set(this, (J) => {
      if (v(this, _J, true, "f"), z4(J)) J = new g$();
      if (J instanceof g$) return v(this, xJ, true, "f"), this._emit("abort", J);
      if (J instanceof y) return this._emit("error", J);
      if (J instanceof Error) {
        let Q = new y(J.message);
        return Q.cause = J, this._emit("error", Q);
      }
      return this._emit("error", new y(String(J)));
    }), v(this, n8, new Promise((J, Q) => {
      v(this, CJ, J, "f"), v(this, r8, Q, "f");
    }), "f"), v(this, o8, new Promise((J, Q) => {
      v(this, kJ, J, "f"), v(this, t8, Q, "f");
    }), "f"), L(this, n8, "f").catch(() => {
    }), L(this, o8, "f").catch(() => {
    }), v(this, G0, $, "f"), v(this, s8, X?.logger ?? console, "f");
  }
  get response() {
    return L(this, TJ, "f");
  }
  get request_id() {
    return L(this, yJ, "f");
  }
  async withResponse() {
    v(this, q1, true, "f");
    let $ = await L(this, n8, "f");
    if (!$) throw Error("Could not resolve a `Response` object");
    return { data: this, response: $, request_id: $.headers.get("request-id") };
  }
  static fromReadableStream($) {
    let X = new _e8(null);
    return X._run(() => X._fromReadableStream($)), X;
  }
  static createMessage($, X, J, { logger: Q } = {}) {
    let Y = new _e8(X, { logger: Q });
    for (let W of X.messages) Y._addMessageParam(W);
    return v(Y, G0, { ...X, stream: true }, "f"), Y._run(() => Y._createMessage($, { ...X, stream: true }, { ...J, headers: { ...J?.headers, "X-Stainless-Helper-Method": "stream" } })), Y;
  }
  _run($) {
    $().then(() => {
      this._emitFinal(), this._emit("end");
    }, L(this, o5, "f"));
  }
  _addMessageParam($) {
    this.messages.push($);
  }
  _addMessage($, X = true) {
    if (this.receivedMessages.push($), X) this._emit("message", $);
  }
  async _createMessage($, X, J) {
    let Q = J?.signal, Y;
    if (Q) {
      if (Q.aborted) this.controller.abort();
      Y = this.controller.abort.bind(this.controller), Q.addEventListener("abort", Y);
    }
    try {
      L(this, A6, "m", t5).call(this);
      let { response: W, data: z } = await $.create({ ...X, stream: true }, { ...J, signal: this.controller.signal }).withResponse();
      this._connected(W);
      for await (let G of z) L(this, A6, "m", a5).call(this, G);
      if (z.controller.signal?.aborted) throw new g$();
      L(this, A6, "m", s5).call(this);
    } finally {
      if (Q && Y) Q.removeEventListener("abort", Y);
    }
  }
  _connected($) {
    if (this.ended) return;
    v(this, TJ, $, "f"), v(this, yJ, $?.headers.get("request-id"), "f"), L(this, CJ, "f").call(this, $), this._emit("connect");
  }
  get ended() {
    return L(this, a8, "f");
  }
  get errored() {
    return L(this, _J, "f");
  }
  get aborted() {
    return L(this, xJ, "f");
  }
  abort() {
    this.controller.abort();
  }
  on($, X) {
    return (L(this, K4, "f")[$] || (L(this, K4, "f")[$] = [])).push({ listener: X }), this;
  }
  off($, X) {
    let J = L(this, K4, "f")[$];
    if (!J) return this;
    let Q = J.findIndex((Y) => Y.listener === X);
    if (Q >= 0) J.splice(Q, 1);
    return this;
  }
  once($, X) {
    return (L(this, K4, "f")[$] || (L(this, K4, "f")[$] = [])).push({ listener: X, once: true }), this;
  }
  emitted($) {
    return new Promise((X, J) => {
      if (v(this, q1, true, "f"), $ !== "error") this.once("error", J);
      this.once($, X);
    });
  }
  async done() {
    v(this, q1, true, "f"), await L(this, o8, "f");
  }
  get currentMessage() {
    return L(this, y4, "f");
  }
  async finalMessage() {
    return await this.done(), L(this, A6, "m", r5).call(this);
  }
  async finalText() {
    return await this.done(), L(this, A6, "m", _K).call(this);
  }
  _emit($, ...X) {
    if (L(this, a8, "f")) return;
    if ($ === "end") v(this, a8, true, "f"), L(this, kJ, "f").call(this);
    let J = L(this, K4, "f")[$];
    if (J) L(this, K4, "f")[$] = J.filter((Q) => !Q.once), J.forEach(({ listener: Q }) => Q(...X));
    if ($ === "abort") {
      let Q = X[0];
      if (!L(this, q1, "f") && !J?.length) Promise.reject(Q);
      L(this, r8, "f").call(this, Q), L(this, t8, "f").call(this, Q), this._emit("end");
      return;
    }
    if ($ === "error") {
      let Q = X[0];
      if (!L(this, q1, "f") && !J?.length) Promise.reject(Q);
      L(this, r8, "f").call(this, Q), L(this, t8, "f").call(this, Q), this._emit("end");
    }
  }
  _emitFinal() {
    if (this.receivedMessages.at(-1)) this._emit("finalMessage", L(this, A6, "m", r5).call(this));
  }
  async _fromReadableStream($, X) {
    let J = X?.signal, Q;
    if (J) {
      if (J.aborted) this.controller.abort();
      Q = this.controller.abort.bind(this.controller), J.addEventListener("abort", Q);
    }
    try {
      L(this, A6, "m", t5).call(this), this._connected(null);
      let Y = B6.fromReadableStream($, this.controller);
      for await (let W of Y) L(this, A6, "m", a5).call(this, W);
      if (Y.controller.signal?.aborted) throw new g$();
      L(this, A6, "m", s5).call(this);
    } finally {
      if (J && Q) J.removeEventListener("abort", Q);
    }
  }
  [(y4 = /* @__PURE__ */ new WeakMap(), G0 = /* @__PURE__ */ new WeakMap(), n8 = /* @__PURE__ */ new WeakMap(), CJ = /* @__PURE__ */ new WeakMap(), r8 = /* @__PURE__ */ new WeakMap(), o8 = /* @__PURE__ */ new WeakMap(), kJ = /* @__PURE__ */ new WeakMap(), t8 = /* @__PURE__ */ new WeakMap(), K4 = /* @__PURE__ */ new WeakMap(), a8 = /* @__PURE__ */ new WeakMap(), _J = /* @__PURE__ */ new WeakMap(), xJ = /* @__PURE__ */ new WeakMap(), q1 = /* @__PURE__ */ new WeakMap(), TJ = /* @__PURE__ */ new WeakMap(), yJ = /* @__PURE__ */ new WeakMap(), s8 = /* @__PURE__ */ new WeakMap(), o5 = /* @__PURE__ */ new WeakMap(), A6 = /* @__PURE__ */ new WeakSet(), r5 = function() {
    if (this.receivedMessages.length === 0) throw new y("stream ended without producing a Message with role=assistant");
    return this.receivedMessages.at(-1);
  }, _K = function() {
    if (this.receivedMessages.length === 0) throw new y("stream ended without producing a Message with role=assistant");
    let X = this.receivedMessages.at(-1).content.filter((J) => J.type === "text").map((J) => J.text);
    if (X.length === 0) throw new y("stream ended without producing a content block with type=text");
    return X.join(" ");
  }, t5 = function() {
    if (this.ended) return;
    v(this, y4, void 0, "f");
  }, a5 = function(X) {
    if (this.ended) return;
    let J = L(this, A6, "m", xK).call(this, X);
    switch (this._emit("streamEvent", X, J), X.type) {
      case "content_block_delta": {
        let Q = J.content.at(-1);
        switch (X.delta.type) {
          case "text_delta": {
            if (Q.type === "text") this._emit("text", X.delta.text, Q.text || "");
            break;
          }
          case "citations_delta": {
            if (Q.type === "text") this._emit("citation", X.delta.citation, Q.citations ?? []);
            break;
          }
          case "input_json_delta": {
            if (yK(Q) && Q.input) this._emit("inputJson", X.delta.partial_json, Q.input);
            break;
          }
          case "thinking_delta": {
            if (Q.type === "thinking") this._emit("thinking", X.delta.thinking, Q.thinking);
            break;
          }
          case "signature_delta": {
            if (Q.type === "thinking") this._emit("signature", Q.signature);
            break;
          }
          default:
            fK(X.delta);
        }
        break;
      }
      case "message_stop": {
        this._addMessageParam(J), this._addMessage(i5(J, L(this, G0, "f"), { logger: L(this, s8, "f") }), true);
        break;
      }
      case "content_block_stop": {
        this._emit("contentBlock", J.content.at(-1));
        break;
      }
      case "message_start": {
        v(this, y4, J, "f");
        break;
      }
      case "content_block_start":
      case "message_delta":
        break;
    }
  }, s5 = function() {
    if (this.ended) throw new y("stream has ended, this shouldn't happen");
    let X = L(this, y4, "f");
    if (!X) throw new y("request ended without sending any chunks");
    return v(this, y4, void 0, "f"), i5(X, L(this, G0, "f"), { logger: L(this, s8, "f") });
  }, xK = function(X) {
    let J = L(this, y4, "f");
    if (X.type === "message_start") {
      if (J) throw new y(`Unexpected event order, got ${X.type} before receiving "message_stop"`);
      return X.message;
    }
    if (!J) throw new y(`Unexpected event order, got ${X.type} before "message_start"`);
    switch (X.type) {
      case "message_stop":
        return J;
      case "message_delta":
        if (J.stop_reason = X.delta.stop_reason, J.stop_sequence = X.delta.stop_sequence, J.usage.output_tokens = X.usage.output_tokens, X.usage.input_tokens != null) J.usage.input_tokens = X.usage.input_tokens;
        if (X.usage.cache_creation_input_tokens != null) J.usage.cache_creation_input_tokens = X.usage.cache_creation_input_tokens;
        if (X.usage.cache_read_input_tokens != null) J.usage.cache_read_input_tokens = X.usage.cache_read_input_tokens;
        if (X.usage.server_tool_use != null) J.usage.server_tool_use = X.usage.server_tool_use;
        return J;
      case "content_block_start":
        return J.content.push({ ...X.content_block }), J;
      case "content_block_delta": {
        let Q = J.content.at(X.index);
        switch (X.delta.type) {
          case "text_delta": {
            if (Q?.type === "text") J.content[X.index] = { ...Q, text: (Q.text || "") + X.delta.text };
            break;
          }
          case "citations_delta": {
            if (Q?.type === "text") J.content[X.index] = { ...Q, citations: [...Q.citations ?? [], X.delta.citation] };
            break;
          }
          case "input_json_delta": {
            if (Q && yK(Q)) {
              let Y = Q[TK] || "";
              Y += X.delta.partial_json;
              let W = { ...Q };
              if (Object.defineProperty(W, TK, { value: Y, enumerable: false, writable: true }), Y) W.input = IJ(Y);
              J.content[X.index] = W;
            }
            break;
          }
          case "thinking_delta": {
            if (Q?.type === "thinking") J.content[X.index] = { ...Q, thinking: Q.thinking + X.delta.thinking };
            break;
          }
          case "signature_delta": {
            if (Q?.type === "thinking") J.content[X.index] = { ...Q, signature: X.delta.signature };
            break;
          }
          default:
            fK(X.delta);
        }
        return J;
      }
      case "content_block_stop":
        return J;
    }
  }, Symbol.asyncIterator)]() {
    let $ = [], X = [], J = false;
    return this.on("streamEvent", (Q) => {
      let Y = X.shift();
      if (Y) Y.resolve(Q);
      else $.push(Q);
    }), this.on("end", () => {
      J = true;
      for (let Q of X) Q.resolve(void 0);
      X.length = 0;
    }), this.on("abort", (Q) => {
      J = true;
      for (let Y of X) Y.reject(Q);
      X.length = 0;
    }), this.on("error", (Q) => {
      J = true;
      for (let Y of X) Y.reject(Q);
      X.length = 0;
    }), { next: async () => {
      if (!$.length) {
        if (J) return { value: void 0, done: true };
        return new Promise((Y, W) => X.push({ resolve: Y, reject: W })).then((Y) => Y ? { value: Y, done: false } : { value: void 0, done: true });
      }
      return { value: $.shift(), done: false };
    }, return: async () => {
      return this.abort(), { value: void 0, done: true };
    } };
  }
  toReadableStream() {
    return new B6(this[Symbol.asyncIterator].bind(this), this.controller).toReadableStream();
  }
};
function fK($) {
}
var $X = class extends b$ {
  create($, X) {
    return this._client.post("/v1/messages/batches", { body: $, ...X });
  }
  retrieve($, X) {
    return this._client.get(M$`/v1/messages/batches/${$}`, X);
  }
  list($ = {}, X) {
    return this._client.getAPIList("/v1/messages/batches", k6, { query: $, ...X });
  }
  delete($, X) {
    return this._client.delete(M$`/v1/messages/batches/${$}`, X);
  }
  cancel($, X) {
    return this._client.post(M$`/v1/messages/batches/${$}/cancel`, X);
  }
  async results($, X) {
    let J = await this.retrieve($);
    if (!J.results_url) throw new y(`No batch \`results_url\`; Has it finished processing? ${J.processing_status} - ${J.id}`);
    return this._client.get(J.results_url, { ...X, headers: i([{ Accept: "application/binary" }, X?.headers]), stream: true, __binaryResponse: true })._thenUnwrap((Q, Y) => Q0.fromResponse(Y.response, Y.controller));
  }
};
var L1 = class extends b$ {
  constructor() {
    super(...arguments);
    this.batches = new $X(this._client);
  }
  create($, X) {
    if ($.model in gK) console.warn(`The model '${$.model}' is deprecated and will reach end-of-life on ${gK[$.model]}
Please migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
    if ($.model in xM && $.thinking && $.thinking.type === "enabled") console.warn(`Using Claude with ${$.model} and 'thinking.type=enabled' is deprecated. Use 'thinking.type=adaptive' instead which results in better model performance in our testing: https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking`);
    let J = this._client._options.timeout;
    if (!$.stream && J == null) {
      let Y = AJ[$.model] ?? void 0;
      J = this._client.calculateNonstreamingTimeout($.max_tokens, Y);
    }
    let Q = MJ($.tools, $.messages);
    return this._client.post("/v1/messages", { body: $, timeout: J ?? 6e5, ...X, headers: i([Q, X?.headers]), stream: $.stream ?? false });
  }
  parse($, X) {
    return this.create($, X).then((J) => n5(J, $, { logger: this._client.logger ?? console }));
  }
  stream($, X) {
    return e8.createMessage(this, $, X, { logger: this._client.logger ?? console });
  }
  countTokens($, X) {
    return this._client.post("/v1/messages/count_tokens", { body: $, ...X });
  }
};
var gK = { "claude-1.3": "November 6th, 2024", "claude-1.3-100k": "November 6th, 2024", "claude-instant-1.1": "November 6th, 2024", "claude-instant-1.1-100k": "November 6th, 2024", "claude-instant-1.2": "November 6th, 2024", "claude-3-sonnet-20240229": "July 21st, 2025", "claude-3-opus-20240229": "January 5th, 2026", "claude-2.1": "July 21st, 2025", "claude-2.0": "July 21st, 2025", "claude-3-7-sonnet-latest": "February 19th, 2026", "claude-3-7-sonnet-20250219": "February 19th, 2026", "claude-3-5-haiku-latest": "February 19th, 2026", "claude-3-5-haiku-20241022": "February 19th, 2026" };
var xM = ["claude-opus-4-6"];
L1.Batches = $X;
var U0 = class extends b$ {
  retrieve($, X = {}, J) {
    let { betas: Q } = X ?? {};
    return this._client.get(M$`/v1/models/${$}`, { ...J, headers: i([{ ...Q?.toString() != null ? { "anthropic-beta": Q?.toString() } : void 0 }, J?.headers]) });
  }
  list($ = {}, X) {
    let { betas: J, ...Q } = $ ?? {};
    return this._client.getAPIList("/v1/models", k6, { query: Q, ...X, headers: i([{ ...J?.toString() != null ? { "anthropic-beta": J?.toString() } : void 0 }, X?.headers]) });
  }
};
var XX = ($) => {
  if (typeof globalThis.process < "u") return globalThis.process.env?.[$]?.trim() ?? void 0;
  if (typeof globalThis.Deno < "u") return globalThis.Deno.env?.get?.($)?.trim();
  return;
};
var e5;
var $W;
var fJ;
var hK;
var uK = "\\n\\nHuman:";
var mK = "\\n\\nAssistant:";
var P$ = class {
  constructor({ baseURL: $ = XX("ANTHROPIC_BASE_URL"), apiKey: X = XX("ANTHROPIC_API_KEY") ?? null, authToken: J = XX("ANTHROPIC_AUTH_TOKEN") ?? null, ...Q } = {}) {
    e5.add(this), fJ.set(this, void 0);
    let Y = { apiKey: X, authToken: J, ...Q, baseURL: $ || "https://api.anthropic.com" };
    if (!Y.dangerouslyAllowBrowser && JK()) throw new y(`It looks like you're running in a browser-like environment.

This is disabled by default, as it risks exposing your secret API credentials to attackers.
If you understand the risks and have appropriate mitigations in place,
you can set the \`dangerouslyAllowBrowser\` option to \`true\`, e.g.,

new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
`);
    this.baseURL = Y.baseURL, this.timeout = Y.timeout ?? $W.DEFAULT_TIMEOUT, this.logger = Y.logger ?? console;
    let W = "warn";
    this.logLevel = W, this.logLevel = C5(Y.logLevel, "ClientOptions.logLevel", this) ?? C5(XX("ANTHROPIC_LOG"), "process.env['ANTHROPIC_LOG']", this) ?? W, this.fetchOptions = Y.fetchOptions, this.maxRetries = Y.maxRetries ?? 2, this.fetch = Y.fetch ?? QK(), v(this, fJ, zK, "f"), this._options = Y, this.apiKey = typeof X === "string" ? X : null, this.authToken = J;
  }
  withOptions($) {
    return new this.constructor({ ...this._options, baseURL: this.baseURL, maxRetries: this.maxRetries, timeout: this.timeout, logger: this.logger, logLevel: this.logLevel, fetch: this.fetch, fetchOptions: this.fetchOptions, apiKey: this.apiKey, authToken: this.authToken, ...$ });
  }
  defaultQuery() {
    return this._options.defaultQuery;
  }
  validateHeaders({ values: $, nulls: X }) {
    if ($.get("x-api-key") || $.get("authorization")) return;
    if (this.apiKey && $.get("x-api-key")) return;
    if (X.has("x-api-key")) return;
    if (this.authToken && $.get("authorization")) return;
    if (X.has("authorization")) return;
    throw Error('Could not resolve authentication method. Expected either apiKey or authToken to be set. Or for one of the "X-Api-Key" or "Authorization" headers to be explicitly omitted');
  }
  async authHeaders($) {
    return i([await this.apiKeyAuth($), await this.bearerAuth($)]);
  }
  async apiKeyAuth($) {
    if (this.apiKey == null) return;
    return i([{ "X-Api-Key": this.apiKey }]);
  }
  async bearerAuth($) {
    if (this.authToken == null) return;
    return i([{ Authorization: `Bearer ${this.authToken}` }]);
  }
  stringifyQuery($) {
    return GK($);
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${C4}`;
  }
  defaultIdempotencyKey() {
    return `stainless-node-retry-${Z5()}`;
  }
  makeStatusError($, X, J, Q) {
    return C$.generate($, X, J, Q);
  }
  buildURL($, X, J) {
    let Q = !L(this, e5, "m", hK).call(this) && J || this.baseURL, Y = oH($) ? new URL($) : new URL(Q + (Q.endsWith("/") && $.startsWith("/") ? $.slice(1) : $)), W = this.defaultQuery(), z = Object.fromEntries(Y.searchParams);
    if (!E5(W) || !E5(z)) X = { ...z, ...W, ...X };
    if (typeof X === "object" && X && !Array.isArray(X)) Y.search = this.stringifyQuery(X);
    return Y.toString();
  }
  _calculateNonstreamingTimeout($) {
    if (3600 * $ / 128e3 > 600) throw new y("Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#streaming-responses for more details");
    return 6e5;
  }
  async prepareOptions($) {
  }
  async prepareRequest($, { url: X, options: J }) {
  }
  get($, X) {
    return this.methodRequest("get", $, X);
  }
  post($, X) {
    return this.methodRequest("post", $, X);
  }
  patch($, X) {
    return this.methodRequest("patch", $, X);
  }
  put($, X) {
    return this.methodRequest("put", $, X);
  }
  delete($, X) {
    return this.methodRequest("delete", $, X);
  }
  methodRequest($, X, J) {
    return this.request(Promise.resolve(J).then((Q) => {
      return { method: $, path: X, ...Q };
    }));
  }
  request($, X = null) {
    return new N1(this, this.makeRequest($, X, void 0));
  }
  async makeRequest($, X, J) {
    let Q = await $, Y = Q.maxRetries ?? this.maxRetries;
    if (X == null) X = Y;
    await this.prepareOptions(Q);
    let { req: W, url: z, timeout: G } = await this.buildRequest(Q, { retryCount: Y - X });
    await this.prepareRequest(W, { url: z, options: Q });
    let U = "log_" + (Math.random() * 16777216 | 0).toString(16).padStart(6, "0"), H = J === void 0 ? "" : `, retryOf: ${J}`, K = Date.now();
    if (y$(this).debug(`[${U}] sending request`, G4({ retryOfRequestLogID: J, method: Q.method, url: z, options: Q, headers: W.headers })), Q.signal?.aborted) throw new g$();
    let V = new AbortController(), N = await this.fetchWithTimeout(z, W, G, V).catch(w8), O = Date.now();
    if (N instanceof globalThis.Error) {
      let D = `retrying, ${X} attempts remaining`;
      if (Q.signal?.aborted) throw new g$();
      let j = z4(N) || /timed? ?out/i.test(String(N) + ("cause" in N ? String(N.cause) : ""));
      if (X) return y$(this).info(`[${U}] connection ${j ? "timed out" : "failed"} - ${D}`), y$(this).debug(`[${U}] connection ${j ? "timed out" : "failed"} (${D})`, G4({ retryOfRequestLogID: J, url: z, durationMs: O - K, message: N.message })), this.retryRequest(Q, X, J ?? U);
      if (y$(this).info(`[${U}] connection ${j ? "timed out" : "failed"} - error; no more retries left`), y$(this).debug(`[${U}] connection ${j ? "timed out" : "failed"} (error; no more retries left)`, G4({ retryOfRequestLogID: J, url: z, durationMs: O - K, message: N.message })), j) throw new B8();
      throw new V1({ cause: N });
    }
    let w = [...N.headers.entries()].filter(([D]) => D === "request-id").map(([D, j]) => ", " + D + ": " + JSON.stringify(j)).join(""), B = `[${U}${H}${w}] ${W.method} ${z} ${N.ok ? "succeeded" : "failed"} with status ${N.status} in ${O - K}ms`;
    if (!N.ok) {
      let D = await this.shouldRetry(N);
      if (X && D) {
        let U$ = `retrying, ${X} attempts remaining`;
        return await WK(N.body), y$(this).info(`${B} - ${U$}`), y$(this).debug(`[${U}] response error (${U$})`, G4({ retryOfRequestLogID: J, url: N.url, status: N.status, headers: N.headers, durationMs: O - K })), this.retryRequest(Q, X, J ?? U, N.headers);
      }
      let j = D ? "error; no more retries left" : "error; not retryable";
      y$(this).info(`${B} - ${j}`);
      let A = await N.text().catch((U$) => w8(U$).message), I = NJ(A), x = I ? void 0 : A;
      throw y$(this).debug(`[${U}] response error (${j})`, G4({ retryOfRequestLogID: J, url: N.url, status: N.status, headers: N.headers, message: x, durationMs: Date.now() - K })), this.makeStatusError(N.status, I, x, N.headers);
    }
    return y$(this).info(B), y$(this).debug(`[${U}] response start`, G4({ retryOfRequestLogID: J, url: N.url, status: N.status, headers: N.headers, durationMs: O - K })), { response: N, options: Q, controller: V, requestLogID: U, retryOfRequestLogID: J, startTime: K };
  }
  getAPIList($, X, J) {
    return this.requestAPIList(X, J && "then" in J ? J.then((Q) => ({ method: "get", path: $, ...Q })) : { method: "get", path: $, ...J });
  }
  requestAPIList($, X) {
    let J = this.makeRequest(X, null, void 0);
    return new DJ(this, J, $);
  }
  async fetchWithTimeout($, X, J, Q) {
    let { signal: Y, method: W, ...z } = X || {}, G = this._makeAbort(Q);
    if (Y) Y.addEventListener("abort", G, { once: true });
    let U = setTimeout(G, J), H = globalThis.ReadableStream && z.body instanceof globalThis.ReadableStream || typeof z.body === "object" && z.body !== null && Symbol.asyncIterator in z.body, K = { signal: Q.signal, ...H ? { duplex: "half" } : {}, method: "GET", ...z };
    if (W) K.method = W.toUpperCase();
    try {
      return await this.fetch.call(void 0, $, K);
    } finally {
      clearTimeout(U);
    }
  }
  async shouldRetry($) {
    let X = $.headers.get("x-should-retry");
    if (X === "true") return true;
    if (X === "false") return false;
    if ($.status === 408) return true;
    if ($.status === 409) return true;
    if ($.status === 429) return true;
    if ($.status >= 500) return true;
    return false;
  }
  async retryRequest($, X, J, Q) {
    let Y, W = Q?.get("retry-after-ms");
    if (W) {
      let G = parseFloat(W);
      if (!Number.isNaN(G)) Y = G;
    }
    let z = Q?.get("retry-after");
    if (z && !Y) {
      let G = parseFloat(z);
      if (!Number.isNaN(G)) Y = G * 1e3;
      else Y = Date.parse(z) - Date.now();
    }
    if (Y === void 0) {
      let G = $.maxRetries ?? this.maxRetries;
      Y = this.calculateDefaultRetryTimeoutMillis(X, G);
    }
    return await sH(Y), this.makeRequest($, X - 1, J);
  }
  calculateDefaultRetryTimeoutMillis($, X) {
    let Y = X - $, W = Math.min(0.5 * Math.pow(2, Y), 8), z = 1 - Math.random() * 0.25;
    return W * z * 1e3;
  }
  calculateNonstreamingTimeout($, X) {
    if (36e5 * $ / 128e3 > 6e5 || X != null && $ > X) throw new y("Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#long-requests for more details");
    return 6e5;
  }
  async buildRequest($, { retryCount: X = 0 } = {}) {
    let J = { ...$ }, { method: Q, path: Y, query: W, defaultBaseURL: z } = J, G = this.buildURL(Y, W, z);
    if ("timeout" in J) aH("timeout", J.timeout);
    J.timeout = J.timeout ?? this.timeout;
    let { bodyHeaders: U, body: H } = this.buildBody({ options: J }), K = await this.buildHeaders({ options: $, method: Q, bodyHeaders: U, retryCount: X });
    return { req: { method: Q, headers: K, ...J.signal && { signal: J.signal }, ...globalThis.ReadableStream && H instanceof globalThis.ReadableStream && { duplex: "half" }, ...H && { body: H }, ...this.fetchOptions ?? {}, ...J.fetchOptions ?? {} }, url: G, timeout: J.timeout };
  }
  async buildHeaders({ options: $, method: X, bodyHeaders: J, retryCount: Q }) {
    let Y = {};
    if (this.idempotencyHeader && X !== "get") {
      if (!$.idempotencyKey) $.idempotencyKey = this.defaultIdempotencyKey();
      Y[this.idempotencyHeader] = $.idempotencyKey;
    }
    let W = i([Y, { Accept: "application/json", "User-Agent": this.getUserAgent(), "X-Stainless-Retry-Count": String(Q), ...$.timeout ? { "X-Stainless-Timeout": String(Math.trunc($.timeout / 1e3)) } : {}, ...YK(), ...this._options.dangerouslyAllowBrowser ? { "anthropic-dangerous-direct-browser-access": "true" } : void 0, "anthropic-version": "2023-06-01" }, await this.authHeaders($), this._options.defaultHeaders, J, $.headers]);
    return this.validateHeaders(W), W.values;
  }
  _makeAbort($) {
    return () => $.abort();
  }
  buildBody({ options: { body: $, headers: X } }) {
    if (!$) return { bodyHeaders: void 0, body: void 0 };
    let J = i([X]);
    if (ArrayBuffer.isView($) || $ instanceof ArrayBuffer || $ instanceof DataView || typeof $ === "string" && J.values.has("content-type") || globalThis.Blob && $ instanceof globalThis.Blob || $ instanceof FormData || $ instanceof URLSearchParams || globalThis.ReadableStream && $ instanceof globalThis.ReadableStream) return { bodyHeaders: void 0, body: $ };
    else if (typeof $ === "object" && (Symbol.asyncIterator in $ || Symbol.iterator in $ && "next" in $ && typeof $.next === "function")) return { bodyHeaders: void 0, body: OJ($) };
    else if (typeof $ === "object" && J.values.get("content-type") === "application/x-www-form-urlencoded") return { bodyHeaders: { "content-type": "application/x-www-form-urlencoded" }, body: this.stringifyQuery($) };
    else return L(this, fJ, "f").call(this, { body: $, headers: J });
  }
};
$W = P$, fJ = /* @__PURE__ */ new WeakMap(), e5 = /* @__PURE__ */ new WeakSet(), hK = function() {
  return this.baseURL !== "https://api.anthropic.com";
};
P$.Anthropic = $W;
P$.HUMAN_PROMPT = uK;
P$.AI_PROMPT = mK;
P$.DEFAULT_TIMEOUT = 6e5;
P$.AnthropicError = y;
P$.APIError = C$;
P$.APIConnectionError = V1;
P$.APIConnectionTimeoutError = B8;
P$.APIUserAbortError = g$;
P$.NotFoundError = j8;
P$.ConflictError = F8;
P$.RateLimitError = A8;
P$.BadRequestError = q8;
P$.AuthenticationError = L8;
P$.InternalServerError = I8;
P$.PermissionDeniedError = D8;
P$.UnprocessableEntityError = M8;
P$.toFile = jJ;
var D1 = class extends P$ {
  constructor() {
    super(...arguments);
    this.completions = new z0(this), this.messages = new L1(this), this.models = new U0(this), this.beta = new r6(this);
  }
};
D1.Completions = z0;
D1.Messages = L1;
D1.Models = U0;
D1.Beta = r6;
function f4($) {
  return $ instanceof Error ? $ : Error(String($));
}
function H0($) {
  return $ instanceof Error ? $.message : String($);
}
function _6($) {
  if ($ && typeof $ === "object" && "code" in $ && typeof $.code === "string") return $.code;
  return;
}
function JX($) {
  return _6($) === "ENOENT";
}
function XW($) {
  return _6($) === "EISDIR";
}
var V0;
var K0 = null;
function hM() {
  if (K0) return K0;
  if (!r$(process.env.DEBUG_CLAUDE_AGENT_SDK)) return V0 = null, K0 = Promise.resolve(), K0;
  let $ = lK(v4(), "debug");
  return V0 = lK($, `sdk-${yM()}.txt`), process.stderr.write(`SDK debug logs: ${V0}
`), K0 = gM($, { recursive: true }).then(() => {
  }).catch(() => {
  }), K0;
}
function Y6($) {
  if (V0 === null) return;
  let J = `${(/* @__PURE__ */ new Date()).toISOString()} ${$}
`;
  hM().then(() => {
    if (V0) fM(V0, J).catch(() => {
    });
  });
}
function mM() {
  let $ = "";
  if (typeof process < "u" && typeof process.cwd === "function" && typeof cK === "function") {
    let J = uM();
    try {
      $ = cK(J).normalize("NFC");
    } catch {
      $ = J.normalize("NFC");
    }
  }
  return { originalCwd: $, projectRoot: $, totalCostUSD: 0, totalAPIDuration: 0, totalAPIDurationWithoutRetries: 0, totalToolDuration: 0, startTime: Date.now(), lastInteractionTime: Date.now(), totalLinesAdded: 0, totalLinesRemoved: 0, hasUnknownModelCost: false, cwd: $, modelUsage: {}, mainLoopModelOverride: void 0, initialMainLoopModel: null, modelStrings: null, isInteractive: false, hasStreamingInput: false, kairosActive: false, strictToolResultPairing: false, memoryToggledOff: false, teamMemoryServerStatus: void 0, sdkAgentProgressSummariesEnabled: false, userMsgOptIn: false, clientType: "cli", sessionSource: void 0, questionPreviewFormat: void 0, sessionIngressToken: void 0, oauthTokenFromFd: void 0, apiKeyFromFd: void 0, flagSettingsPath: void 0, flagSettingsInline: null, allowedSettingSources: ["userSettings", "projectSettings", "localSettings", "flagSettings", "policySettings"], meter: null, sessionCounter: null, locCounter: null, prCounter: null, commitCounter: null, costCounter: null, tokenCounter: null, codeEditToolDecisionCounter: null, activeTimeCounter: null, statsStore: null, sessionId: YX(), parentSessionId: void 0, loggerProvider: null, eventLogger: null, meterProvider: null, tracerProvider: null, agentColorMap: /* @__PURE__ */ new Map(), agentColorIndex: 0, lastAPIRequest: null, lastAPIRequestMessages: null, lastClassifierRequests: null, cachedClaudeMdContent: null, inMemoryErrorLog: [], inlinePlugins: [], chromeFlagOverride: void 0, useCoworkPlugins: false, sessionBypassPermissionsMode: false, scheduledTasksEnabled: false, sessionCronTasks: [], loopChainStartedAt: /* @__PURE__ */ Object.create(null), sessionCreatedTeams: /* @__PURE__ */ new Set(), sessionTrustAccepted: false, sessionPersistenceDisabled: false, hasExitedPlanMode: false, needsPlanModeExitAttachment: false, needsAutoModeExitAttachment: false, lspRecommendationShownThisSession: false, initJsonSchema: null, registeredHooks: null, planSlugCache: /* @__PURE__ */ new Map(), teleportedSessionInfo: null, invokedSkills: /* @__PURE__ */ new Map(), slowOperations: [], sdkBetas: void 0, sdkOAuthTokenRefreshCallback: null, mainThreadAgentType: void 0, isRemoteMode: false, replBridgeActive: false, directConnectServerUrl: void 0, activeRoutine: void 0, systemPromptSectionCache: /* @__PURE__ */ new Map(), lastEmittedDate: null, additionalDirectoriesForClaudeMd: [], allowedChannels: [], hasDevChannels: false, sessionProjectDir: null, promptCache1hAllowlist: null, afkModeHeaderLatched: null, fastModeHeaderLatched: null, cacheEditingHeaderLatched: null, thinkingClearLatched: null, promptId: null, lastMainRequestId: void 0, lastApiCompletionTimestamp: null, pendingPostCompaction: false };
}
var lM = mM();
function JW() {
  return lM.sessionId;
}
var cM = n1();
var jl = cM.subscribe;
var pM = n1();
var Fl = pM.subscribe;
var dM = n1();
var Ml = dM.subscribe;
function pK({ writeFn: $, flushIntervalMs: X = 1e3, maxBufferSize: J = 100, maxBufferBytes: Q = 1 / 0, immediateMode: Y = false }) {
  let W = [], z = 0, G = null, U = null;
  function H() {
    if (G) clearTimeout(G), G = null;
  }
  function K() {
    if (U) $(U.join("")), U = null;
    if (W.length === 0) return;
    $(W.join("")), W = [], z = 0, H();
  }
  function V() {
    if (!G) G = setTimeout(K, X);
  }
  function N() {
    if (U) {
      U.push(...W), W = [], z = 0, H();
      return;
    }
    let O = W;
    W = [], z = 0, H(), U = O, setImmediate(() => {
      let w = U;
      if (U = null, w) $(w.join(""));
    });
  }
  return { write(O) {
    if (Y) {
      $(O);
      return;
    }
    if (W.push(O), z += O.length, V(), W.length >= J || z >= Q) N();
  }, flush: K, dispose() {
    K();
  } };
}
var dK = /* @__PURE__ */ new Set();
function iK($) {
  return dK.add($), () => dK.delete($);
}
var nK = C6(($) => {
  if (!$ || $.trim() === "") return null;
  let X = $.split(",").map((W) => W.trim()).filter(Boolean);
  if (X.length === 0) return null;
  let J = X.some((W) => W.startsWith("!")), Q = X.some((W) => !W.startsWith("!"));
  if (J && Q) return null;
  let Y = X.map((W) => W.replace(/^!/, "").toLowerCase());
  return { include: J ? [] : Y, exclude: J ? Y : [], isExclusive: J };
});
function iM($) {
  let X = [], J = $.match(/^MCP server ["']([^"']+)["']/);
  if (J && J[1]) X.push("mcp"), X.push(J[1].toLowerCase());
  else {
    let W = $.match(/^([^:[]+):/);
    if (W && W[1]) X.push(W[1].trim().toLowerCase());
  }
  let Q = $.match(/^\[([^\]]+)]/);
  if (Q && Q[1]) X.push(Q[1].trim().toLowerCase());
  if ($.toLowerCase().includes("1p event:")) X.push("1p");
  let Y = $.match(/:\s*([^:]+?)(?:\s+(?:type|mode|status|event))?:/);
  if (Y && Y[1]) {
    let W = Y[1].trim().toLowerCase();
    if (W.length < 30 && !W.includes(" ")) X.push(W);
  }
  return Array.from(new Set(X));
}
function nM($, X) {
  if (!X) return true;
  if ($.length === 0) return false;
  if (X.isExclusive) return !$.some((J) => X.exclude.includes(J));
  else return $.some((J) => X.include.includes(J));
}
function rK($, X) {
  if (!X) return true;
  let J = iM($);
  return nM(J, X);
}
var J2 = { cwd() {
  return process.cwd();
}, existsSync($) {
  let J = [];
  try {
    const X = w$(J, Z$`fs.existsSync(${$})`, 0);
    return r.existsSync($);
  } catch (Q) {
    var Y = Q, W = 1;
  } finally {
    B$(J, Y, W);
  }
}, async stat($) {
  return $2($);
}, async readdir($) {
  return tM($, { withFileTypes: true });
}, async unlink($) {
  return X2($);
}, async rmdir($) {
  return sM($);
}, async rm($, X) {
  return eM($, X);
}, async mkdir($, X) {
  try {
    await rM($, { recursive: true, ...X });
  } catch (J) {
    if (_6(J) !== "EEXIST") throw J;
  }
}, async readFile($, X) {
  return oK($, { encoding: X.encoding });
}, async rename($, X) {
  return aM($, X);
}, statSync($) {
  let J = [];
  try {
    const X = w$(J, Z$`fs.statSync(${$})`, 0);
    return r.statSync($);
  } catch (Q) {
    var Y = Q, W = 1;
  } finally {
    B$(J, Y, W);
  }
}, lstatSync($) {
  let J = [];
  try {
    const X = w$(J, Z$`fs.lstatSync(${$})`, 0);
    return r.lstatSync($);
  } catch (Q) {
    var Y = Q, W = 1;
  } finally {
    B$(J, Y, W);
  }
}, readFileSync($, X) {
  let Q = [];
  try {
    const J = w$(Q, Z$`fs.readFileSync(${$})`, 0);
    return r.readFileSync($, { encoding: X.encoding });
  } catch (Y) {
    var W = Y, z = 1;
  } finally {
    B$(Q, W, z);
  }
}, readFileBytesSync($) {
  let J = [];
  try {
    const X = w$(J, Z$`fs.readFileBytesSync(${$})`, 0);
    return r.readFileSync($);
  } catch (Q) {
    var Y = Q, W = 1;
  } finally {
    B$(J, Y, W);
  }
}, readSync($, X) {
  let Y = [];
  try {
    const J = w$(Y, Z$`fs.readSync(${$}, ${X.length} bytes)`, 0);
    let Q = void 0;
    try {
      Q = r.openSync($, "r");
      let U = Buffer.alloc(X.length), H = r.readSync(Q, U, 0, X.length, 0);
      return { buffer: U, bytesRead: H };
    } finally {
      if (Q) r.closeSync(Q);
    }
  } catch (W) {
    var z = W, G = 1;
  } finally {
    B$(Y, z, G);
  }
}, appendFileSync($, X, J) {
  let Y = [];
  try {
    const Q = w$(Y, Z$`fs.appendFileSync(${$}, ${X.length} chars)`, 0);
    if (J?.mode !== void 0) try {
      let U = r.openSync($, "ax", J.mode);
      try {
        r.appendFileSync(U, X);
      } finally {
        r.closeSync(U);
      }
      return;
    } catch (U) {
      if (_6(U) !== "EEXIST") throw U;
    }
    r.appendFileSync($, X);
  } catch (W) {
    var z = W, G = 1;
  } finally {
    B$(Y, z, G);
  }
}, copyFileSync($, X) {
  let Q = [];
  try {
    const J = w$(Q, Z$`fs.copyFileSync(${$} → ${X})`, 0);
    r.copyFileSync($, X);
  } catch (Y) {
    var W = Y, z = 1;
  } finally {
    B$(Q, W, z);
  }
}, unlinkSync($) {
  let J = [];
  try {
    const X = w$(J, Z$`fs.unlinkSync(${$})`, 0);
    r.unlinkSync($);
  } catch (Q) {
    var Y = Q, W = 1;
  } finally {
    B$(J, Y, W);
  }
}, renameSync($, X) {
  let Q = [];
  try {
    const J = w$(Q, Z$`fs.renameSync(${$} → ${X})`, 0);
    r.renameSync($, X);
  } catch (Y) {
    var W = Y, z = 1;
  } finally {
    B$(Q, W, z);
  }
}, linkSync($, X) {
  let Q = [];
  try {
    const J = w$(Q, Z$`fs.linkSync(${$} → ${X})`, 0);
    r.linkSync($, X);
  } catch (Y) {
    var W = Y, z = 1;
  } finally {
    B$(Q, W, z);
  }
}, symlinkSync($, X, J) {
  let Y = [];
  try {
    const Q = w$(Y, Z$`fs.symlinkSync(${$} → ${X})`, 0);
    r.symlinkSync($, X, J);
  } catch (W) {
    var z = W, G = 1;
  } finally {
    B$(Y, z, G);
  }
}, readlinkSync($) {
  let J = [];
  try {
    const X = w$(J, Z$`fs.readlinkSync(${$})`, 0);
    return r.readlinkSync($);
  } catch (Q) {
    var Y = Q, W = 1;
  } finally {
    B$(J, Y, W);
  }
}, realpathSync($) {
  let J = [];
  try {
    const X = w$(J, Z$`fs.realpathSync(${$})`, 0);
    return r.realpathSync($).normalize("NFC");
  } catch (Q) {
    var Y = Q, W = 1;
  } finally {
    B$(J, Y, W);
  }
}, mkdirSync($, X) {
  let Y = [];
  try {
    const J = w$(Y, Z$`fs.mkdirSync(${$})`, 0);
    let Q = { recursive: true };
    if (X?.mode !== void 0) Q.mode = X.mode;
    try {
      r.mkdirSync($, Q);
    } catch (U) {
      if (_6(U) !== "EEXIST") throw U;
    }
  } catch (W) {
    var z = W, G = 1;
  } finally {
    B$(Y, z, G);
  }
}, readdirSync($) {
  let J = [];
  try {
    const X = w$(J, Z$`fs.readdirSync(${$})`, 0);
    return r.readdirSync($, { withFileTypes: true });
  } catch (Q) {
    var Y = Q, W = 1;
  } finally {
    B$(J, Y, W);
  }
}, readdirStringSync($) {
  let J = [];
  try {
    const X = w$(J, Z$`fs.readdirStringSync(${$})`, 0);
    return r.readdirSync($);
  } catch (Q) {
    var Y = Q, W = 1;
  } finally {
    B$(J, Y, W);
  }
}, isDirEmptySync($) {
  let Q = [];
  try {
    const X = w$(Q, Z$`fs.isDirEmptySync(${$})`, 0);
    let J = this.readdirSync($);
    return J.length === 0;
  } catch (Y) {
    var W = Y, z = 1;
  } finally {
    B$(Q, W, z);
  }
}, rmdirSync($) {
  let J = [];
  try {
    const X = w$(J, Z$`fs.rmdirSync(${$})`, 0);
    r.rmdirSync($);
  } catch (Q) {
    var Y = Q, W = 1;
  } finally {
    B$(J, Y, W);
  }
}, rmSync($, X) {
  let Q = [];
  try {
    const J = w$(Q, Z$`fs.rmSync(${$})`, 0);
    r.rmSync($, X);
  } catch (Y) {
    var W = Y, z = 1;
  } finally {
    B$(Q, W, z);
  }
}, createWriteStream($) {
  return r.createWriteStream($);
}, async readFileBytes($, X) {
  if (X === void 0) return oK($);
  let J = await oM($, "r");
  try {
    let { size: Q } = await J.stat(), Y = Math.min(Q, X), W = Buffer.allocUnsafe(Y), z = 0;
    while (z < Y) {
      let { bytesRead: G } = await J.read(W, z, Y - z, z);
      if (G === 0) break;
      z += G;
    }
    return z < Y ? W.subarray(0, z) : W;
  } finally {
    await J.close();
  }
} };
var Y2 = J2;
function gJ() {
  return Y2;
}
function Q2($, X) {
  if ($.destroyed) return;
  $.write(X);
}
function tK($) {
  Q2(process.stderr, $);
}
var QW = { verbose: 0, debug: 1, info: 2, warn: 3, error: 4 };
var U2 = C6(() => {
  let $ = process.env.CLAUDE_CODE_DEBUG_LOG_LEVEL?.toLowerCase().trim();
  if ($ && Object.hasOwn(QW, $)) return $;
  return "debug";
});
var H2 = false;
function uJ() {
  return typeof process < "u" && Array.isArray(process.argv) ? process.argv : [];
}
var WW = C6(() => {
  let $ = uJ();
  return H2 || r$(process.env.DEBUG) || r$(process.env.DEBUG_SDK) || $.includes("--debug") || $.includes("-d") || eK() || $.some((X) => X.startsWith("--debug=")) || $V() !== null;
});
var K2 = C6(() => {
  let $ = uJ().find((J) => J.startsWith("--debug="));
  if (!$) return null;
  let X = $.substring(8);
  return nK(X);
});
var eK = C6(() => {
  let $ = uJ();
  return $.includes("--debug-to-stderr") || $.includes("-d2e");
});
var $V = C6(() => {
  let $ = uJ();
  for (let X = 0; X < $.length; X++) {
    let J = $[X];
    if (J.startsWith("--debug-file=")) return J.substring(13);
    if (J === "--debug-file" && X + 1 < $.length) return $[X + 1];
  }
  return null;
});
function V2($) {
  if (!WW()) return false;
  if (typeof process > "u" || typeof process.versions > "u" || typeof process.versions.node > "u") return false;
  let X = K2();
  return rK($, X);
}
var N2 = false;
var hJ = null;
var YW = Promise.resolve();
var zW = null;
function XV($) {
  return zW = GW($, `${JW()}.txt`), zW;
}
async function O2($, X, J, Q) {
  if ($) await W2(X, { recursive: true }).catch(() => {
  });
  try {
    await aK(J, Q);
  } catch (Y) {
    if (!XW(Y)) throw Y;
    await aK(XV(J), Q);
  }
  YV();
}
function w2() {
}
function B2() {
  if (!hJ) {
    let $ = null;
    hJ = pK({ writeFn: (X) => {
      let J = JV(), Q = sK(J), Y = $ !== Q;
      if ($ = Q, WW()) {
        if (Y) try {
          gJ().mkdirSync(Q);
        } catch {
        }
        try {
          gJ().appendFileSync(J, X);
        } catch (W) {
          if (!XW(W)) throw W;
          gJ().appendFileSync(XV(J), X);
        }
        YV();
        return;
      }
      YW = YW.then(O2.bind(null, Y, Q, J, X)).catch(w2);
    }, flushIntervalMs: 1e3, maxBufferSize: 100, immediateMode: WW() }), iK(async () => {
      hJ?.dispose(), await YW;
    });
  }
  return hJ;
}
function f$($, { level: X } = { level: "debug" }) {
  if (QW[X] < QW[U2()]) return;
  if (!V2($)) return;
  if (N2 && $.includes(`
`)) $ = q$($);
  let Q = `${(/* @__PURE__ */ new Date()).toISOString()} [${X.toUpperCase()}] ${$.trim()}
`;
  if (eK()) {
    tK(Q);
    return;
  }
  B2().write(Q);
}
function JV() {
  return $V() ?? zW ?? process.env.CLAUDE_CODE_DEBUG_LOGS_DIR ?? GW(v4(), "debug", `${JW()}.txt`);
}
var YV = C6(async () => {
  try {
    let $ = JV(), X = sK($), J = GW(X, "latest");
    await G2(J).catch(() => {
    }), await z2($, J);
  } catch {
  }
});
var tl = (() => {
  let $ = process.env.CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS;
  if ($ !== void 0) {
    let X = Number($);
    if (!Number.isNaN(X) && X >= 0) return X;
  }
  return 1 / 0;
})();
var q2 = { [Symbol.dispose]() {
} };
function L2() {
  return q2;
}
var Z$ = L2;
function q$($, X, J) {
  let Y = [];
  try {
    const Q = w$(Y, Z$`JSON.stringify(${$})`, 0);
    return JSON.stringify($, X, J);
  } catch (W) {
    var z = W, G = 1;
  } finally {
    B$(Y, z, G);
  }
}
var o$ = ($, X) => {
  let Q = [];
  try {
    const J = w$(Q, Z$`JSON.parse(${$})`, 0);
    return typeof X > "u" ? JSON.parse($) : JSON.parse($, X);
  } catch (Y) {
    var W = Y, z = 1;
  } finally {
    B$(Q, W, z);
  }
};
function D2($) {
  let X = $.trim();
  return X.startsWith("{") && X.endsWith("}");
}
function QV($, X) {
  let J = { ...$ };
  if (X) {
    let Q = X.enabled === true && X.failIfUnavailable === void 0 ? { ...X, failIfUnavailable: true } : X, Y = J.settings;
    if (Y && !D2(Y)) throw Error("Cannot use both a settings file path and the sandbox option. Include the sandbox configuration in your settings file instead.");
    let W = { sandbox: Q };
    if (Y) try {
      W = { ...o$(Y), sandbox: Q };
    } catch {
    }
    J.settings = q$(W);
  }
  return J;
}
var M2 = 2e3;
var mJ = /* @__PURE__ */ new Set();
var WV = false;
function A2() {
  for (let $ of mJ) if (!$.killed) $.kill("SIGTERM");
}
function I2($) {
  if (mJ.add($), !WV) WV = true, process.on("exit", A2);
}
var QX = class {
  options;
  process;
  processStdin;
  processStdout;
  ready = false;
  abortController;
  exitError;
  exitListeners = [];
  abortHandler;
  pendingWrites = [];
  pendingEndInput = false;
  spawnResolve;
  spawnReject;
  spawnPromise;
  constructor($) {
    this.options = $;
    if (this.abortController = $.abortController || d1(), $.deferSpawn) this.spawnPromise = new Promise((X, J) => {
      this.spawnResolve = X, this.spawnReject = J;
    }), this.spawnPromise.catch(() => {
    });
    else this.initialize();
  }
  spawn() {
    try {
      this.initialize();
    } catch (X) {
      throw this.spawnAbort(f4(X)), X;
    }
    let $ = this.pendingWrites;
    if (this.pendingWrites = [], this.spawnResolve) this.spawnResolve(), this.spawnResolve = void 0, this.spawnReject = void 0;
    for (let X of $) this.write(X);
    if (this.pendingEndInput) this.pendingEndInput = false, this.processStdin?.end();
  }
  spawnAbort($) {
    if (this.spawnReject) this.spawnReject($), this.spawnReject = void 0, this.spawnResolve = void 0, this.pendingWrites = [];
  }
  updateEnv($) {
    if (this.options.env) Object.assign(this.options.env, $);
    else this.options.env = { ...$ };
  }
  getDefaultExecutable() {
    return i1() ? "bun" : "node";
  }
  spawnLocalProcess($) {
    let { command: X, args: J, cwd: Q, env: Y, signal: W } = $, z = r$(Y.DEBUG_CLAUDE_AGENT_SDK) || this.options.stderr ? "pipe" : "ignore", G = j2(X, J, { cwd: Q, stdio: ["pipe", "pipe", z], signal: W, env: Y, windowsHide: true });
    if (r$(Y.DEBUG_CLAUDE_AGENT_SDK) || this.options.stderr) G.stderr.on("data", (H) => {
      let K = H.toString();
      if (Y6(K), this.options.stderr) this.options.stderr(K);
    });
    return { stdin: G.stdin, stdout: G.stdout, get killed() {
      return G.killed;
    }, get exitCode() {
      return G.exitCode;
    }, kill: G.kill.bind(G), on: G.on.bind(G), once: G.once.bind(G), off: G.off.bind(G) };
  }
  initialize() {
    try {
      let { additionalDirectories: $ = [], agent: X, betas: J, cwd: Q, executable: Y = this.getDefaultExecutable(), executableArgs: W = [], extraArgs: z = {}, pathToClaudeCodeExecutable: G, env: U = { ...process.env }, thinkingConfig: H, maxTurns: K, maxBudgetUsd: V, taskBudget: N, model: O, fallbackModel: w, jsonSchema: B, permissionMode: D, allowDangerouslySkipPermissions: j, permissionPromptToolName: A, continueConversation: I, resume: x, settingSources: T, allowedTools: U$ = [], disallowedTools: T$ = [], tools: n$, mcpServers: X4, strictMcpConfig: X6, canUseTool: U1, includePartialMessages: l1, plugins: J4, sandbox: z8 } = this.options, p = ["--output-format", "stream-json", "--verbose", "--input-format", "stream-json"];
      if (H) {
        switch (H.type) {
          case "enabled":
            if (H.budgetTokens === void 0) p.push("--thinking", "adaptive");
            else p.push("--max-thinking-tokens", H.budgetTokens.toString());
            break;
          case "disabled":
            p.push("--thinking", "disabled");
            break;
          case "adaptive":
            p.push("--thinking", "adaptive");
            break;
        }
        if (H.type !== "disabled" && H.display) p.push("--thinking-display", H.display);
      }
      if (this.options.effort) p.push("--effort", this.options.effort);
      if (K) p.push("--max-turns", K.toString());
      if (V !== void 0) p.push("--max-budget-usd", V.toString());
      if (N) p.push("--task-budget", N.total.toString());
      if (O) p.push("--model", O);
      if (X) p.push("--agent", X);
      if (J && J.length > 0) p.push("--betas", J.join(","));
      if (B) p.push("--json-schema", q$(B));
      if (this.options.debugFile) p.push("--debug-file", this.options.debugFile);
      else if (this.options.debug) p.push("--debug");
      if (r$(U.DEBUG_CLAUDE_AGENT_SDK)) p.push("--debug-to-stderr");
      if (U1) {
        if (A) throw Error("canUseTool callback cannot be used with permissionPromptToolName. Please use one or the other.");
        p.push("--permission-prompt-tool", "stdio");
      } else if (A) p.push("--permission-prompt-tool", A);
      if (I) p.push("--continue");
      if (x) p.push("--resume", x);
      if (this.options.assistant) p.push("--assistant");
      if (this.options.channels && this.options.channels.length > 0) p.push("--channels", ...this.options.channels);
      if (U$.length > 0) p.push("--allowedTools", U$.join(","));
      if (T$.length > 0) p.push("--disallowedTools", T$.join(","));
      if (n$ !== void 0) if (Array.isArray(n$)) if (n$.length === 0) p.push("--tools", "");
      else p.push("--tools", n$.join(","));
      else p.push("--tools", "default");
      if (X4 && Object.keys(X4).length > 0) p.push("--mcp-config", q$({ mcpServers: X4 }));
      if (T !== void 0) p.push(`--setting-sources=${T.join(",")}`);
      if (X6) p.push("--strict-mcp-config");
      if (D) p.push("--permission-mode", D);
      if (j) p.push("--allow-dangerously-skip-permissions");
      if (w) {
        if (O && w === O) throw Error("Fallback model cannot be the same as the main model. Please specify a different model for fallbackModel option.");
        p.push("--fallback-model", w);
      }
      if (this.options.includeHookEvents) p.push("--include-hook-events");
      if (l1) p.push("--include-partial-messages");
      if (this.options.sessionMirror) p.push("--session-mirror");
      for (let l$ of $) p.push("--add-dir", l$);
      if (J4 && J4.length > 0) for (let l$ of J4) if (l$.type === "local") p.push("--plugin-dir", l$.path);
      else throw Error(`Unsupported plugin type: ${l$.type}`);
      if (this.options.forkSession) p.push("--fork-session");
      if (this.options.resumeSessionAt) p.push("--resume-session-at", this.options.resumeSessionAt);
      if (this.options.sessionId) p.push("--session-id", this.options.sessionId);
      if (this.options.persistSession === false) p.push("--no-session-persistence");
      let G8 = { ...z ?? {} };
      if (this.options.settings) G8.settings = this.options.settings;
      let D5 = QV(G8, z8);
      for (let [l$, v6] of Object.entries(D5)) if (v6 === null) p.push(`--${l$}`);
      else p.push(`--${l$}`, v6);
      if (!U.CLAUDE_CODE_ENTRYPOINT) U.CLAUDE_CODE_ENTRYPOINT = "sdk-ts";
      if (delete U.NODE_OPTIONS, r$(U.DEBUG_CLAUDE_AGENT_SDK)) U.DEBUG = "1";
      else delete U.DEBUG;
      let c1 = b2(G), U8 = c1 ? G : Y, H8 = c1 ? [...W, ...p] : [...W, G, ...p], GJ = { command: U8, args: H8, cwd: Q, env: U, signal: this.abortController.signal };
      if (this.options.spawnClaudeCodeProcess) Y6(`Spawning Claude Code (custom): ${U8} ${H8.join(" ")}`), this.process = this.options.spawnClaudeCodeProcess(GJ);
      else Y6(`Spawning Claude Code: ${U8} ${H8.join(" ")}`), this.process = this.spawnLocalProcess(GJ);
      this.processStdin = this.process.stdin, this.processStdout = this.process.stdout, I2(this.process), this.abortHandler = () => {
        if (this.process && !this.process.killed) this.process.kill("SIGTERM");
      }, this.abortController.signal.addEventListener("abort", this.abortHandler), this.process.on("error", (l$) => {
        if (this.ready = false, this.abortController.signal.aborted) this.exitError = new J6("Claude Code process aborted by user");
        else if (JX(l$)) {
          let v6 = c1 ? `Claude Code native binary not found at ${G}. Please ensure Claude Code is installed via native installer or specify a valid path with options.pathToClaudeCodeExecutable.` : `Claude Code executable not found at ${G}. Is options.pathToClaudeCodeExecutable set?`;
          this.exitError = ReferenceError(v6), Y6(this.exitError.message);
        } else this.exitError = Error(`Failed to spawn Claude Code process: ${l$.message}`), Y6(this.exitError.message);
      }), this.process.on("exit", (l$, v6) => {
        if (this.ready = false, this.abortController.signal.aborted) this.exitError = new J6("Claude Code process aborted by user");
        else {
          let Y4 = this.getProcessExitError(l$, v6);
          if (Y4) this.exitError = Y4, Y6(Y4.message);
        }
      }), this.ready = true;
    } catch ($) {
      throw this.ready = false, $;
    }
  }
  getProcessExitError($, X) {
    if ($ !== 0 && $ !== null) return Error(`Claude Code process exited with code ${$}`);
    else if (X) return Error(`Claude Code process terminated by signal ${X}`);
    return;
  }
  write($) {
    if (this.abortController.signal.aborted) throw new J6("Operation aborted");
    if (this.spawnResolve) {
      this.pendingWrites.push($);
      return;
    }
    if (!this.ready || !this.processStdin) throw Error("ProcessTransport is not ready for writing");
    if (this.processStdin.writableEnded) {
      Y6("[ProcessTransport] Dropping write to ended stdin stream");
      return;
    }
    if (this.process?.killed || this.process?.exitCode !== null) throw Error("Cannot write to terminated process");
    if (this.exitError) throw Error(`Cannot write to process that exited with error: ${this.exitError.message}`);
    Y6(`[ProcessTransport] Writing to stdin: ${$.substring(0, 100)}`);
    try {
      if (!this.processStdin.write($)) Y6("[ProcessTransport] Write buffer full, data queued");
    } catch (X) {
      throw this.ready = false, Error(`Failed to write to process stdin: ${H0(X)}`);
    }
  }
  [Symbol.dispose]() {
    this.close();
  }
  close() {
    if (this.spawnAbort(Error("Query closed before spawn")), this.processStdin) this.processStdin.end(), this.processStdin = void 0;
    if (this.abortHandler) this.abortController.signal.removeEventListener("abort", this.abortHandler), this.abortHandler = void 0;
    for (let { handler: X } of this.exitListeners) this.process?.off("exit", X);
    this.exitListeners = [];
    let $ = this.process;
    if ($ && !$.killed && $.exitCode === null) setTimeout((X) => {
      if (X.killed || X.exitCode !== null) return;
      X.kill("SIGTERM"), setTimeout((J) => {
        if (J.exitCode === null) J.kill("SIGKILL");
      }, 5e3, X).unref();
    }, M2, $).unref(), $.once("exit", () => mJ.delete($));
    else if ($) mJ.delete($);
    this.ready = false;
  }
  isReady() {
    return this.ready;
  }
  async *readMessages() {
    if (this.spawnPromise) await this.spawnPromise, this.spawnPromise = void 0;
    if (!this.processStdout) throw Error("ProcessTransport output stream not available");
    if (this.exitError) throw this.exitError;
    let $ = F2({ input: this.processStdout }), X = this.process ? (() => {
      let J = this.process, Q = () => $.close();
      return J.on("error", Q), () => J.off("error", Q);
    })() : void 0;
    if (this.exitError) $.close();
    try {
      for await (let J of $) if (J.trim()) {
        let Q;
        try {
          Q = o$(J);
        } catch (Y) {
          Y6(`Non-JSON stdout: ${J}`);
          continue;
        }
        yield Q;
      }
      if (this.exitError) throw this.exitError;
      await this.waitForExit();
    } catch (J) {
      throw J;
    } finally {
      X?.(), $.close();
    }
  }
  endInput() {
    if (this.spawnResolve) {
      this.pendingEndInput = true;
      return;
    }
    if (this.processStdin) this.processStdin.end();
  }
  getInputStream() {
    return this.processStdin;
  }
  onExit($) {
    if (!this.process) return () => {
    };
    let X = (J, Q) => {
      let Y = this.getProcessExitError(J, Q);
      $(Y);
    };
    return this.process.on("exit", X), this.exitListeners.push({ callback: $, handler: X }), () => {
      if (this.process) this.process.off("exit", X);
      let J = this.exitListeners.findIndex((Q) => Q.handler === X);
      if (J !== -1) this.exitListeners.splice(J, 1);
    };
  }
  async waitForExit() {
    if (!this.process) {
      if (this.exitError) throw this.exitError;
      return;
    }
    if (this.process.exitCode !== null || this.process.killed || this.exitError) {
      if (this.exitError) throw this.exitError;
      return;
    }
    return new Promise(($, X) => {
      let J = (Y, W) => {
        if (this.abortController.signal.aborted) {
          X(new J6("Operation aborted"));
          return;
        }
        let z = this.getProcessExitError(Y, W);
        if (z) X(z);
        else $();
      };
      this.process.once("exit", J);
      let Q = (Y) => {
        this.process.off("exit", J), X(Y);
      };
      this.process.once("error", Q), this.process.once("exit", () => {
        this.process.off("error", Q);
      });
    });
  }
};
function b2($) {
  return ![".js", ".mjs", ".tsx", ".ts", ".jsx"].some((J) => $.endsWith(J));
}
function lJ($, X = process.platform, J = process.arch) {
  let Y = X === "win32" ? ".exe" : "", z = (X === "linux" ? [`@anthropic-ai/claude-agent-sdk-linux-${J}-musl`, `@anthropic-ai/claude-agent-sdk-linux-${J}`] : [`@anthropic-ai/claude-agent-sdk-${X}-${J}`]).map((G) => `${G}/claude${Y}`);
  for (let G of z) try {
    return $(G);
  } catch {
  }
  return null;
}
var j1 = class {
  returned;
  queue = [];
  readResolve;
  readReject;
  isDone = false;
  hasError;
  started = false;
  constructor($) {
    this.returned = $;
  }
  [Symbol.asyncIterator]() {
    if (this.started) throw Error("Stream can only be iterated once");
    return this.started = true, this;
  }
  next() {
    if (this.queue.length > 0) return Promise.resolve({ done: false, value: this.queue.shift() });
    if (this.isDone) return Promise.resolve({ done: true, value: void 0 });
    if (this.hasError) return Promise.reject(this.hasError);
    return new Promise(($, X) => {
      this.readResolve = $, this.readReject = X;
    });
  }
  enqueue($) {
    if (this.readResolve) {
      let X = this.readResolve;
      this.readResolve = void 0, this.readReject = void 0, X({ done: false, value: $ });
    } else this.queue.push($);
  }
  done() {
    if (this.isDone = true, this.readResolve) {
      let $ = this.readResolve;
      this.readResolve = void 0, this.readReject = void 0, $({ done: true, value: void 0 });
    }
  }
  error($) {
    if (this.hasError = $, this.readReject) {
      let X = this.readReject;
      this.readResolve = void 0, this.readReject = void 0, X($);
    }
  }
  return() {
    if (this.isDone = true, this.returned) this.returned();
    return Promise.resolve({ done: true, value: void 0 });
  }
};
var UW = class {
  sendMcpMessage;
  isClosed = false;
  constructor($) {
    this.sendMcpMessage = $;
  }
  onclose;
  onerror;
  onmessage;
  async start() {
  }
  async send($) {
    if (this.isClosed) throw Error("Transport is closed");
    this.sendMcpMessage($);
  }
  async close() {
    if (this.isClosed) return;
    this.isClosed = true, this.onclose?.();
  }
};
var WX = class {
  transport;
  isSingleUserTurn;
  canUseTool;
  hooks;
  abortController;
  jsonSchema;
  initConfig;
  onElicitation;
  getOAuthToken;
  pendingControlResponses = /* @__PURE__ */ new Map();
  cleanupPerformed = false;
  sdkMessages;
  inputStream = new j1();
  initialization;
  cancelControllers = /* @__PURE__ */ new Map();
  hookCallbacks = /* @__PURE__ */ new Map();
  nextCallbackId = 0;
  sdkMcpTransports = /* @__PURE__ */ new Map();
  sdkMcpServerInstances = /* @__PURE__ */ new Map();
  pendingMcpResponses = /* @__PURE__ */ new Map();
  firstResultReceivedResolve;
  firstResultReceived = false;
  lastErrorResultText;
  transcriptMirrorBatcher;
  cleanupCallbacks = [];
  cleanupPromise;
  setIsSingleUserTurn($) {
    this.isSingleUserTurn = $;
  }
  setTranscriptMirrorBatcher($) {
    this.transcriptMirrorBatcher = $;
  }
  reportMirrorError($, X) {
    let J = { type: "system", subtype: "mirror_error", error: X, key: $, uuid: YX(), session_id: $.sessionId };
    this.inputStream.enqueue(J);
  }
  addCleanupCallback($) {
    if (this.cleanupPerformed) $();
    else this.cleanupCallbacks.push($);
  }
  isClosed() {
    return this.cleanupPerformed;
  }
  hasBidirectionalNeeds() {
    return this.sdkMcpTransports.size > 0 || this.hooks !== void 0 && Object.keys(this.hooks).length > 0 || this.canUseTool !== void 0 || this.onElicitation !== void 0 || this.getOAuthToken !== void 0;
  }
  constructor($, X, J, Q, Y, W = /* @__PURE__ */ new Map(), z, G, U, H) {
    this.transport = $;
    this.isSingleUserTurn = X;
    this.canUseTool = J;
    this.hooks = Q;
    this.abortController = Y;
    this.jsonSchema = z;
    this.initConfig = G;
    this.onElicitation = U;
    this.getOAuthToken = H;
    for (let [K, V] of W) this.connectSdkMcpServer(K, V);
    this.sdkMessages = this.readSdkMessages(), this.readMessages(), this.initialization = this.initialize(), this.initialization.catch(() => {
    });
  }
  setError($) {
    this.inputStream.error($);
  }
  async stopTask($) {
    await this.request({ subtype: "stop_task", task_id: $ });
  }
  close() {
    this.cleanup();
  }
  cleanup($) {
    if (this.cleanupPromise) return this.cleanupPromise;
    return this.cleanupPerformed = true, this.cleanupPromise = this.performCleanup($), this.cleanupPromise;
  }
  async performCleanup($) {
    for (let X of this.cleanupCallbacks) try {
      X();
    } catch {
    }
    if (this.cleanupCallbacks = [], this.transcriptMirrorBatcher) try {
      await this.transcriptMirrorBatcher.flush();
    } catch {
    }
    try {
      for (let J of this.cancelControllers.values()) J.abort();
      this.cancelControllers.clear(), this.transport.close();
      let X = $ ?? Error("Query closed before response received");
      for (let { reject: J } of this.pendingControlResponses.values()) J(X);
      this.pendingControlResponses.clear();
      for (let { reject: J } of this.pendingMcpResponses.values()) J(X);
      this.pendingMcpResponses.clear(), this.hookCallbacks.clear();
      for (let J of this.sdkMcpTransports.values()) J.close().catch(() => {
      });
      if (this.sdkMcpTransports.clear(), $) this.inputStream.error($);
      else this.inputStream.done();
    } catch (X) {
    }
  }
  next(...[$]) {
    return this.sdkMessages.next(...[$]);
  }
  async return($) {
    return await this.cleanup(), this.sdkMessages.return($);
  }
  async throw($) {
    return await this.cleanup(), this.sdkMessages.throw($);
  }
  [Symbol.asyncIterator]() {
    return this.sdkMessages;
  }
  async [Symbol.asyncDispose]() {
    await this.cleanup();
  }
  async readMessages() {
    try {
      for await (let $ of this.transport.readMessages()) {
        if ($.type === "control_response") {
          let X = this.pendingControlResponses.get($.response.request_id);
          if (X) X.handler($.response);
          continue;
        } else if ($.type === "control_request") {
          this.handleControlRequest($);
          continue;
        } else if ($.type === "control_cancel_request") {
          this.handleControlCancelRequest($);
          continue;
        } else if ($.type === "keep_alive") continue;
        else if ($.type === "transcript_mirror") {
          this.transcriptMirrorBatcher?.enqueue($.filePath, $.entries);
          continue;
        }
        if ($.type === "system" && $.subtype === "post_turn_summary") {
          this.inputStream.enqueue($);
          continue;
        }
        if ($.type === "result") {
          if (this.transcriptMirrorBatcher) await this.transcriptMirrorBatcher.flush();
          if (this.lastErrorResultText = $.is_error ? $.subtype === "success" ? $.result : $.errors.join("; ") : void 0, this.firstResultReceived = true, this.firstResultReceivedResolve) this.firstResultReceivedResolve();
          if (this.isSingleUserTurn) f$("[Query.readMessages] First result received for single-turn query, closing stdin"), this.transport.endInput();
        } else if (!($.type === "system" && $.subtype === "session_state_changed")) this.lastErrorResultText = void 0;
        this.inputStream.enqueue($);
      }
      if (this.transcriptMirrorBatcher) await this.transcriptMirrorBatcher.flush();
      if (this.firstResultReceivedResolve) this.firstResultReceivedResolve();
      this.inputStream.done(), this.cleanup();
    } catch ($) {
      if (this.transcriptMirrorBatcher) await this.transcriptMirrorBatcher.flush();
      if (this.firstResultReceivedResolve) this.firstResultReceivedResolve();
      if (this.lastErrorResultText !== void 0 && !($ instanceof J6)) {
        let X = Error(`Claude Code returned an error result: ${this.lastErrorResultText}`);
        f$(`[Query.readMessages] Replacing exit error with result text. Original: ${H0($)}`), this.inputStream.error(X), this.cleanup(X);
        return;
      }
      this.inputStream.error($), this.cleanup($);
    }
  }
  async handleControlRequest($) {
    let X = new AbortController();
    this.cancelControllers.set($.request_id, X);
    try {
      let J = await this.processControlRequest($, X.signal);
      if (this.cleanupPerformed) return;
      let Q = { type: "control_response", response: { subtype: "success", request_id: $.request_id, response: J } };
      await Promise.resolve(this.transport.write(q$(Q) + `
`));
    } catch (J) {
      if (this.cleanupPerformed) return;
      let Q = { type: "control_response", response: { subtype: "error", request_id: $.request_id, error: H0(J) } };
      try {
        await Promise.resolve(this.transport.write(q$(Q) + `
`));
      } catch (Y) {
        f$(`[Query.handleControlRequest] Error-response write failed: ${H0(Y)}`, { level: "error" });
      }
    } finally {
      this.cancelControllers.delete($.request_id);
    }
  }
  handleControlCancelRequest($) {
    let X = this.cancelControllers.get($.request_id);
    if (X) X.abort(), this.cancelControllers.delete($.request_id);
  }
  async processControlRequest($, X) {
    if ($.request.subtype === "can_use_tool") {
      if (!this.canUseTool) throw Error("canUseTool callback is not provided.");
      return { ...await this.canUseTool($.request.tool_name, $.request.input, { signal: X, suggestions: $.request.permission_suggestions, blockedPath: $.request.blocked_path, decisionReason: $.request.decision_reason, title: $.request.title, displayName: $.request.display_name, description: $.request.description, toolUseID: $.request.tool_use_id, agentID: $.request.agent_id }), toolUseID: $.request.tool_use_id };
    } else if ($.request.subtype === "hook_callback") return await this.handleHookCallbacks($.request.callback_id, $.request.input, $.request.tool_use_id, X);
    else if ($.request.subtype === "mcp_message") {
      let J = $.request, Q = this.sdkMcpTransports.get(J.server_name);
      if (!Q) throw Error(`SDK MCP server not found: ${J.server_name}`);
      if ("method" in J.message && "id" in J.message && J.message.id !== null) return { mcp_response: await this.handleMcpControlRequest(J.server_name, J, Q) };
      else {
        if (Q.onmessage) Q.onmessage(J.message);
        return { mcp_response: { jsonrpc: "2.0", result: {}, id: 0 } };
      }
    } else if ($.request.subtype === "elicitation") {
      let J = $.request;
      if (this.onElicitation) return await this.onElicitation({ serverName: J.mcp_server_name, message: J.message, mode: J.mode, url: J.url, elicitationId: J.elicitation_id, requestedSchema: J.requested_schema, title: J.title, displayName: J.display_name, description: J.description }, { signal: X });
      return { action: "decline" };
    } else if ($.request.subtype === "oauth_token_refresh") {
      if (!this.getOAuthToken) throw Error("getOAuthToken callback is not provided.");
      return { accessToken: await this.getOAuthToken({ signal: X }) ?? null };
    }
    throw Error("Unsupported control request subtype: " + $.request.subtype);
  }
  async *readSdkMessages() {
    try {
      for await (let $ of this.inputStream) yield $;
    } finally {
      await this.cleanup();
    }
  }
  async initialize() {
    let $;
    if (this.hooks) {
      $ = {};
      for (let [Y, W] of Object.entries(this.hooks)) if (W.length > 0) $[Y] = W.map((z) => {
        let G = [];
        for (let U of z.hooks) {
          let H = `hook_${this.nextCallbackId++}`;
          this.hookCallbacks.set(H, U), G.push(H);
        }
        return { matcher: z.matcher, hookCallbackIds: G, timeout: z.timeout };
      });
    }
    let X = this.sdkMcpTransports.size > 0 ? Array.from(this.sdkMcpTransports.keys()) : void 0, J = { subtype: "initialize", hooks: $, sdkMcpServers: X, jsonSchema: this.jsonSchema, systemPrompt: typeof this.initConfig?.systemPrompt === "string" ? [this.initConfig.systemPrompt] : this.initConfig?.systemPrompt, appendSystemPrompt: this.initConfig?.appendSystemPrompt, appendSubagentSystemPrompt: this.initConfig?.appendSubagentSystemPrompt, excludeDynamicSections: this.initConfig?.excludeDynamicSections, agents: this.initConfig?.agents, promptSuggestions: this.initConfig?.promptSuggestions, agentProgressSummaries: this.initConfig?.agentProgressSummaries };
    return (await this.request(J)).response;
  }
  async interrupt() {
    await this.request({ subtype: "interrupt" });
  }
  async setPermissionMode($) {
    await this.request({ subtype: "set_permission_mode", mode: $ });
  }
  async setModel($) {
    await this.request({ subtype: "set_model", model: $ });
  }
  async setMaxThinkingTokens($) {
    await this.request({ subtype: "set_max_thinking_tokens", max_thinking_tokens: $ });
  }
  async applyFlagSettings($) {
    await this.request({ subtype: "apply_flag_settings", settings: $ });
  }
  async getSettings() {
    return (await this.request({ subtype: "get_settings" })).response;
  }
  async rewindFiles($, X) {
    return (await this.request({ subtype: "rewind_files", user_message_id: $, dry_run: X?.dryRun })).response;
  }
  async cancelAsyncMessage($) {
    return (await this.request({ subtype: "cancel_async_message", message_uuid: $ })).response.cancelled;
  }
  async seedReadState($, X) {
    await this.request({ subtype: "seed_read_state", path: $, mtime: X });
  }
  async enableRemoteControl($, X) {
    return (await this.request({ subtype: "remote_control", enabled: $, ...X !== void 0 && { name: X } })).response;
  }
  async generateSessionTitle($, X) {
    return (await this.request({ subtype: "generate_session_title", description: $, persist: X?.persist })).response.title;
  }
  async askSideQuestion($) {
    let J = (await this.request({ subtype: "side_question", question: $ })).response;
    return J.response === null ? null : { response: J.response, synthetic: J.synthetic ?? false };
  }
  async launchUltrareview($, X) {
    return (await this.request({ subtype: "ultrareview_launch", args: $, confirm: X?.confirm ?? false })).response;
  }
  processPendingPermissionRequests($) {
    for (let X of $) if (X.request.subtype === "can_use_tool") this.handleControlRequest(X).catch(() => {
    });
  }
  request($) {
    let X = Math.random().toString(36).substring(2, 15), J = { request_id: X, type: "control_request", request: $ };
    return new Promise((Q, Y) => {
      this.pendingControlResponses.set(X, { handler: (W) => {
        if (this.pendingControlResponses.delete(X), W.subtype === "success") Q(W);
        else if (Y(Error(W.error)), W.pending_permission_requests) this.processPendingPermissionRequests(W.pending_permission_requests);
      }, reject: Y }), Promise.resolve(this.transport.write(q$(J) + `
`)).catch((W) => {
        this.pendingControlResponses.delete(X), Y(W);
      });
    });
  }
  initializationResult() {
    return this.initialization;
  }
  async supportedCommands() {
    return (await this.initialization).commands;
  }
  async supportedModels() {
    return (await this.initialization).models;
  }
  async supportedAgents() {
    return (await this.initialization).agents;
  }
  async reconnectMcpServer($) {
    await this.request({ subtype: "mcp_reconnect", serverName: $ });
  }
  async toggleMcpServer($, X) {
    await this.request({ subtype: "mcp_toggle", serverName: $, enabled: X });
  }
  async enableChannel($) {
    await this.request({ subtype: "channel_enable", serverName: $ });
  }
  async mcpAuthenticate($) {
    return (await this.request({ subtype: "mcp_authenticate", serverName: $ })).response;
  }
  async mcpClearAuth($) {
    return (await this.request({ subtype: "mcp_clear_auth", serverName: $ })).response;
  }
  async mcpSubmitOAuthCallbackUrl($, X) {
    return (await this.request({ subtype: "mcp_oauth_callback_url", serverName: $, callbackUrl: X })).response;
  }
  async claudeAuthenticate($) {
    return (await this.request({ subtype: "claude_authenticate", loginWithClaudeAi: $ })).response;
  }
  async claudeOAuthCallback($, X) {
    return (await this.request({ subtype: "claude_oauth_callback", authorizationCode: $, state: X })).response;
  }
  async claudeOAuthWaitForCompletion() {
    return (await this.request({ subtype: "claude_oauth_wait_for_completion" })).response;
  }
  async mcpServerStatus() {
    return (await this.request({ subtype: "mcp_status" })).response.mcpServers;
  }
  async getContextUsage() {
    return (await this.request({ subtype: "get_context_usage" })).response;
  }
  async reloadPlugins() {
    return (await this.request({ subtype: "reload_plugins" })).response;
  }
  async setMcpServers($) {
    let X = {}, J = {};
    for (let [G, U] of Object.entries($)) if (U.type === "sdk" && "instance" in U) X[G] = U.instance;
    else J[G] = U;
    let Q = new Set(this.sdkMcpServerInstances.keys()), Y = new Set(Object.keys(X));
    for (let G of Q) if (!Y.has(G)) await this.disconnectSdkMcpServer(G);
    for (let [G, U] of Object.entries(X)) if (!Q.has(G)) this.connectSdkMcpServer(G, U);
    let W = {};
    for (let G of Object.keys(X)) W[G] = { type: "sdk", name: G };
    return (await this.request({ subtype: "mcp_set_servers", servers: { ...J, ...W } })).response;
  }
  async accountInfo() {
    return (await this.initialization).account;
  }
  async streamInput($) {
    f$("[Query.streamInput] Starting to process input stream");
    try {
      let X = 0;
      for await (let J of $) {
        if (X++, f$(`[Query.streamInput] Processing message ${X}: ${J.type}`), this.abortController?.signal.aborted) break;
        await Promise.resolve(this.transport.write(q$(J) + `
`));
      }
      if (f$(`[Query.streamInput] Finished processing ${X} messages from input stream`), X > 0 && this.hasBidirectionalNeeds()) f$("[Query.streamInput] Has bidirectional needs, waiting for first result"), await this.waitForFirstResult();
      f$("[Query] Calling transport.endInput() to close stdin to CLI process"), this.transport.endInput();
    } catch (X) {
      if (!(X instanceof J6)) throw X;
    }
  }
  waitForFirstResult() {
    if (this.firstResultReceived) return f$("[Query.waitForFirstResult] Result already received, returning immediately"), Promise.resolve();
    return new Promise(($) => {
      if (this.abortController?.signal.aborted) {
        $();
        return;
      }
      this.abortController?.signal.addEventListener("abort", () => $(), { once: true }), this.firstResultReceivedResolve = $;
    });
  }
  handleHookCallbacks($, X, J, Q) {
    let Y = this.hookCallbacks.get($);
    if (!Y) throw Error(`No hook callback found for ID: ${$}`);
    return Y(X, J, { signal: Q });
  }
  connectSdkMcpServer($, X) {
    let J = new UW((Q) => this.sendMcpServerMessageToCli($, Q));
    this.sdkMcpTransports.set($, J), this.sdkMcpServerInstances.set($, X), X.connect(J).catch((Q) => {
      if (this.sdkMcpTransports.get($) === J) this.sdkMcpTransports.delete($);
      if (this.sdkMcpServerInstances.get($) === X) this.sdkMcpServerInstances.delete($);
      f$(`[Query.connectSdkMcpServer] Failed to connect MCP server '${$}': ${Q}`, { level: "error" });
    });
  }
  async disconnectSdkMcpServer($) {
    let X = this.sdkMcpTransports.get($);
    if (X) await X.close(), this.sdkMcpTransports.delete($);
    this.sdkMcpServerInstances.delete($);
  }
  sendMcpServerMessageToCli($, X) {
    if ("id" in X && X.id !== null && X.id !== void 0) {
      let Q = `${$}:${X.id}`, Y = this.pendingMcpResponses.get(Q);
      if (Y) {
        Y.resolve(X), this.pendingMcpResponses.delete(Q);
        return;
      }
    }
    let J = { type: "control_request", request_id: YX(), request: { subtype: "mcp_message", server_name: $, message: X } };
    Promise.resolve(this.transport.write(q$(J) + `
`)).catch((Q) => {
      f$(`[Query.sendMcpServerMessageToCli] Transport write failed: ${Q}`, { level: "error" });
    });
  }
  handleMcpControlRequest($, X, J) {
    let Q = "id" in X.message ? X.message.id : null, Y = `${$}:${Q}`;
    return new Promise((W, z) => {
      let G = () => {
        this.pendingMcpResponses.delete(Y);
      }, U = (K) => {
        G(), W(K);
      }, H = (K) => {
        G(), z(K);
      };
      if (this.pendingMcpResponses.set(Y, { resolve: U, reject: H }), J.onmessage) J.onmessage(X.message);
      else {
        G(), z(Error("No message handler registered"));
        return;
      }
    });
  }
};
var Z2 = 500;
var P2 = 1048576;
var HW = class {
  send;
  sendTimeoutMs;
  onError;
  maxPendingEntries;
  maxPendingBytes;
  pending = [];
  pendingEntries = 0;
  pendingBytes = 0;
  flushPromise = null;
  constructor($, X = 6e4, J, Q = Z2, Y = P2) {
    this.send = $;
    this.sendTimeoutMs = X;
    this.onError = J;
    this.maxPendingEntries = Q;
    this.maxPendingBytes = Y;
  }
  enqueue($, X) {
    let J = q$(X).length;
    if (this.pending.push({ filePath: $, entries: X, bytes: J }), this.pendingEntries += X.length, this.pendingBytes += J, this.pendingEntries > this.maxPendingEntries || this.pendingBytes > this.maxPendingBytes) this.flushPromise = this.drain(), this.flushPromise.catch(() => {
    });
  }
  async flush() {
    let $ = this.drain();
    if (this.flushPromise = $, await $, this.flushPromise === $) this.flushPromise = null;
  }
  async drain() {
    let $ = this.flushPromise, X = this.pending.splice(0);
    if (this.pendingEntries = 0, this.pendingBytes = 0, $) await $;
    if (X.length === 0) return;
    await this.doFlush(X);
  }
  async doFlush($) {
    let X = /* @__PURE__ */ new Map();
    for (let J of $) {
      let Q = X.get(J.filePath);
      if (Q) Q.push(...J.entries);
      else X.set(J.filePath, J.entries.slice());
    }
    for (let [J, Q] of X) try {
      await K1(this.send(J, Q), this.sendTimeoutMs, `SessionStore.append() timed out after ${this.sendTimeoutMs}ms for ${J}`);
    } catch (Y) {
      f$(`[TranscriptMirrorBatcher] flush failed for ${J}: ${Y}`, { level: "error" });
      try {
        this.onError?.(J, f4(Y));
      } catch (W) {
        f$(`[TranscriptMirrorBatcher] onError callback threw: ${W}`, { level: "error" });
      }
    }
  }
};
var _2 = k2(C2);
function GV($) {
  let X = 0;
  for (let J = 0; J < $.length; J++) X = (X << 5) - X + $.charCodeAt(J) | 0;
  return X;
}
var y2 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function N$($) {
  if (typeof $ !== "string") return null;
  return y2.test($) ? $ : null;
}
async function GX($, X) {
  let J = x2($, { mode: 384 });
  try {
    for (let Q of X) if (!J.write(JSON.stringify(Q) + `
`)) await UV(J, "drain");
    J.end(), await UV(J, "finish");
  } catch (Q) {
    throw J.destroy(), Q;
  }
}
var O0 = 200;
function h2($) {
  return Math.abs(GV($)).toString(36);
}
function A1($) {
  let X = $.replace(/[^a-zA-Z0-9]/g, "-");
  if (X.length <= O0) return X;
  return `${X.slice(0, O0)}-${h2($)}`;
}
var pJ = Buffer.from('{"type":"attribution-snapshot"');
var p2 = Buffer.from('{"type":"system"');
var zX = 10;
var d2 = Buffer.from([zX]);
function AA() {
  return "prod";
}
var IA = "user:inference";
var TV = "user:profile";
var bA = "org:create_api_key";
var ZA = [bA, TV];
var PA = [TV, IA, "user:sessions:claude_code", "user:mcp_servers", "user:file_upload"];
var _p = Array.from(/* @__PURE__ */ new Set([...ZA, ...PA]));
var xV = { BASE_API_URL: "https://api.anthropic.com", CONSOLE_AUTHORIZE_URL: "https://platform.claude.com/oauth/authorize", CLAUDE_AI_AUTHORIZE_URL: "https://claude.com/cai/oauth/authorize", CLAUDE_AI_ORIGIN: "https://claude.ai", TOKEN_URL: "https://platform.claude.com/v1/oauth/token", API_KEY_URL: "https://api.anthropic.com/api/oauth/claude_cli/create_api_key", ROLES_URL: "https://api.anthropic.com/api/oauth/claude_cli/roles", CONSOLE_SUCCESS_URL: "https://platform.claude.com/buy_credits?returnUrl=/oauth/code/success%3Fapp%3Dclaude-code", CLAUDEAI_SUCCESS_URL: "https://platform.claude.com/oauth/code/success?app=claude-code", MANUAL_REDIRECT_URL: "https://platform.claude.com/oauth/code/callback", CLIENT_ID: "9d1c250a-e61b-44d9-88ed-5944d1962f5e", OAUTH_FILE_SUFFIX: "", MCP_PROXY_URL: "https://mcp-proxy.anthropic.com", MCP_PROXY_PATH: "/v1/mcp/{server_id}" };
var RA = void 0;
function EA() {
  let $ = process.env.CLAUDE_LOCAL_OAUTH_API_BASE?.replace(/\/$/, "") ?? "http://localhost:8000", X = process.env.CLAUDE_LOCAL_OAUTH_APPS_BASE?.replace(/\/$/, "") ?? "http://localhost:4000", J = process.env.CLAUDE_LOCAL_OAUTH_CONSOLE_BASE?.replace(/\/$/, "") ?? "http://localhost:3000";
  return { BASE_API_URL: $, CONSOLE_AUTHORIZE_URL: `${J}/oauth/authorize`, CLAUDE_AI_AUTHORIZE_URL: `${X}/oauth/authorize`, CLAUDE_AI_ORIGIN: X, TOKEN_URL: `${$}/v1/oauth/token`, API_KEY_URL: `${$}/api/oauth/claude_cli/create_api_key`, ROLES_URL: `${$}/api/oauth/claude_cli/roles`, CONSOLE_SUCCESS_URL: `${J}/buy_credits?returnUrl=/oauth/code/success%3Fapp%3Dclaude-code`, CLAUDEAI_SUCCESS_URL: `${J}/oauth/code/success?app=claude-code`, MANUAL_REDIRECT_URL: `${J}/oauth/code/callback`, CLIENT_ID: "22422756-60c9-4084-8eb7-27705fd5cf9a", OAUTH_FILE_SUFFIX: "-local-oauth", MCP_PROXY_URL: "http://localhost:8205", MCP_PROXY_PATH: "/v1/toolbox/shttp/mcp/{server_id}" };
}
var SA = ["https://beacon.claude-ai.staging.ant.dev", "https://claude.fedstart.com", "https://claude-staging.fedstart.com"];
function yV() {
  let $ = (() => {
    switch (AA()) {
      case "local":
        return EA();
      case "staging":
        return RA ?? xV;
      case "prod":
        return xV;
    }
  })(), X = process.env.CLAUDE_CODE_CUSTOM_OAUTH_URL;
  if (X) {
    let Q = X.replace(/\/$/, "");
    if (!SA.includes(Q)) throw Error("CLAUDE_CODE_CUSTOM_OAUTH_URL is not an approved endpoint.");
    $ = { ...$, BASE_API_URL: Q, CONSOLE_AUTHORIZE_URL: `${Q}/oauth/authorize`, CLAUDE_AI_AUTHORIZE_URL: `${Q}/oauth/authorize`, CLAUDE_AI_ORIGIN: Q, TOKEN_URL: `${Q}/v1/oauth/token`, API_KEY_URL: `${Q}/api/oauth/claude_cli/create_api_key`, ROLES_URL: `${Q}/api/oauth/claude_cli/roles`, CONSOLE_SUCCESS_URL: `${Q}/oauth/code/success?app=claude-code`, CLAUDEAI_SUCCESS_URL: `${Q}/oauth/code/success?app=claude-code`, MANUAL_REDIRECT_URL: `${Q}/oauth/code/callback`, OAUTH_FILE_SUFFIX: "-custom-oauth" };
  }
  let J = process.env.CLAUDE_CODE_OAUTH_CLIENT_ID;
  if (J) $ = { ...$, CLIENT_ID: J };
  return $;
}
var fV = "-credentials";
function gV($ = "") {
  let X = v4(), Q = !process.env.CLAUDE_CONFIG_DIR ? "" : `-${vA("sha256").update(X).digest("hex").substring(0, 8)}`;
  return `Claude Code${yV().OAUTH_FILE_SUFFIX}${$}${Q}`;
}
function hV() {
  try {
    return process.env.USER || CA().username;
  } catch {
    return "claude-code-user";
  }
}
var X$;
(function($) {
  $.assertEqual = (Y) => {
  };
  function X(Y) {
  }
  $.assertIs = X;
  function J(Y) {
    throw Error();
  }
  $.assertNever = J, $.arrayToEnum = (Y) => {
    let W = {};
    for (let z of Y) W[z] = z;
    return W;
  }, $.getValidEnumValues = (Y) => {
    let W = $.objectKeys(Y).filter((G) => typeof Y[Y[G]] !== "number"), z = {};
    for (let G of W) z[G] = Y[G];
    return $.objectValues(z);
  }, $.objectValues = (Y) => {
    return $.objectKeys(Y).map(function(W) {
      return Y[W];
    });
  }, $.objectKeys = typeof Object.keys === "function" ? (Y) => Object.keys(Y) : (Y) => {
    let W = [];
    for (let z in Y) if (Object.prototype.hasOwnProperty.call(Y, z)) W.push(z);
    return W;
  }, $.find = (Y, W) => {
    for (let z of Y) if (W(z)) return z;
    return;
  }, $.isInteger = typeof Number.isInteger === "function" ? (Y) => Number.isInteger(Y) : (Y) => typeof Y === "number" && Number.isFinite(Y) && Math.floor(Y) === Y;
  function Q(Y, W = " | ") {
    return Y.map((z) => typeof z === "string" ? `'${z}'` : z).join(W);
  }
  $.joinValues = Q, $.jsonStringifyReplacer = (Y, W) => {
    if (typeof W === "bigint") return W.toString();
    return W;
  };
})(X$ || (X$ = {}));
var uV;
(function($) {
  $.mergeShapes = (X, J) => {
    return { ...X, ...J };
  };
})(uV || (uV = {}));
var E = X$.arrayToEnum(["string", "nan", "number", "integer", "float", "boolean", "date", "bigint", "symbol", "function", "undefined", "null", "array", "object", "unknown", "promise", "void", "never", "map", "set"]);
var N4 = ($) => {
  switch (typeof $) {
    case "undefined":
      return E.undefined;
    case "string":
      return E.string;
    case "number":
      return Number.isNaN($) ? E.nan : E.number;
    case "boolean":
      return E.boolean;
    case "function":
      return E.function;
    case "bigint":
      return E.bigint;
    case "symbol":
      return E.symbol;
    case "object":
      if (Array.isArray($)) return E.array;
      if ($ === null) return E.null;
      if ($.then && typeof $.then === "function" && $.catch && typeof $.catch === "function") return E.promise;
      if (typeof Map < "u" && $ instanceof Map) return E.map;
      if (typeof Set < "u" && $ instanceof Set) return E.set;
      if (typeof Date < "u" && $ instanceof Date) return E.date;
      return E.object;
    default:
      return E.unknown;
  }
};
var b = X$.arrayToEnum(["invalid_type", "invalid_literal", "custom", "invalid_union", "invalid_union_discriminator", "invalid_enum_value", "unrecognized_keys", "invalid_arguments", "invalid_return_type", "invalid_date", "invalid_string", "too_small", "too_big", "invalid_intersection_types", "not_multiple_of", "not_finite"]);
var L6 = class _L6 extends Error {
  get errors() {
    return this.issues;
  }
  constructor($) {
    super();
    this.issues = [], this.addIssue = (J) => {
      this.issues = [...this.issues, J];
    }, this.addIssues = (J = []) => {
      this.issues = [...this.issues, ...J];
    };
    let X = new.target.prototype;
    if (Object.setPrototypeOf) Object.setPrototypeOf(this, X);
    else this.__proto__ = X;
    this.name = "ZodError", this.issues = $;
  }
  format($) {
    let X = $ || function(Y) {
      return Y.message;
    }, J = { _errors: [] }, Q = (Y) => {
      for (let W of Y.issues) if (W.code === "invalid_union") W.unionErrors.map(Q);
      else if (W.code === "invalid_return_type") Q(W.returnTypeError);
      else if (W.code === "invalid_arguments") Q(W.argumentsError);
      else if (W.path.length === 0) J._errors.push(X(W));
      else {
        let z = J, G = 0;
        while (G < W.path.length) {
          let U = W.path[G];
          if (G !== W.path.length - 1) z[U] = z[U] || { _errors: [] };
          else z[U] = z[U] || { _errors: [] }, z[U]._errors.push(X(W));
          z = z[U], G++;
        }
      }
    };
    return Q(this), J;
  }
  static assert($) {
    if (!($ instanceof _L6)) throw Error(`Not a ZodError: ${$}`);
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, X$.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten($ = (X) => X.message) {
    let X = {}, J = [];
    for (let Q of this.issues) if (Q.path.length > 0) {
      let Y = Q.path[0];
      X[Y] = X[Y] || [], X[Y].push($(Q));
    } else J.push($(Q));
    return { formErrors: J, fieldErrors: X };
  }
  get formErrors() {
    return this.flatten();
  }
};
L6.create = ($) => {
  return new L6($);
};
var kA = ($, X) => {
  let J;
  switch ($.code) {
    case b.invalid_type:
      if ($.received === E.undefined) J = "Required";
      else J = `Expected ${$.expected}, received ${$.received}`;
      break;
    case b.invalid_literal:
      J = `Invalid literal value, expected ${JSON.stringify($.expected, X$.jsonStringifyReplacer)}`;
      break;
    case b.unrecognized_keys:
      J = `Unrecognized key(s) in object: ${X$.joinValues($.keys, ", ")}`;
      break;
    case b.invalid_union:
      J = "Invalid input";
      break;
    case b.invalid_union_discriminator:
      J = `Invalid discriminator value. Expected ${X$.joinValues($.options)}`;
      break;
    case b.invalid_enum_value:
      J = `Invalid enum value. Expected ${X$.joinValues($.options)}, received '${$.received}'`;
      break;
    case b.invalid_arguments:
      J = "Invalid function arguments";
      break;
    case b.invalid_return_type:
      J = "Invalid function return type";
      break;
    case b.invalid_date:
      J = "Invalid date";
      break;
    case b.invalid_string:
      if (typeof $.validation === "object") if ("includes" in $.validation) {
        if (J = `Invalid input: must include "${$.validation.includes}"`, typeof $.validation.position === "number") J = `${J} at one or more positions greater than or equal to ${$.validation.position}`;
      } else if ("startsWith" in $.validation) J = `Invalid input: must start with "${$.validation.startsWith}"`;
      else if ("endsWith" in $.validation) J = `Invalid input: must end with "${$.validation.endsWith}"`;
      else X$.assertNever($.validation);
      else if ($.validation !== "regex") J = `Invalid ${$.validation}`;
      else J = "Invalid";
      break;
    case b.too_small:
      if ($.type === "array") J = `Array must contain ${$.exact ? "exactly" : $.inclusive ? "at least" : "more than"} ${$.minimum} element(s)`;
      else if ($.type === "string") J = `String must contain ${$.exact ? "exactly" : $.inclusive ? "at least" : "over"} ${$.minimum} character(s)`;
      else if ($.type === "number") J = `Number must be ${$.exact ? "exactly equal to " : $.inclusive ? "greater than or equal to " : "greater than "}${$.minimum}`;
      else if ($.type === "bigint") J = `Number must be ${$.exact ? "exactly equal to " : $.inclusive ? "greater than or equal to " : "greater than "}${$.minimum}`;
      else if ($.type === "date") J = `Date must be ${$.exact ? "exactly equal to " : $.inclusive ? "greater than or equal to " : "greater than "}${new Date(Number($.minimum))}`;
      else J = "Invalid input";
      break;
    case b.too_big:
      if ($.type === "array") J = `Array must contain ${$.exact ? "exactly" : $.inclusive ? "at most" : "less than"} ${$.maximum} element(s)`;
      else if ($.type === "string") J = `String must contain ${$.exact ? "exactly" : $.inclusive ? "at most" : "under"} ${$.maximum} character(s)`;
      else if ($.type === "number") J = `Number must be ${$.exact ? "exactly" : $.inclusive ? "less than or equal to" : "less than"} ${$.maximum}`;
      else if ($.type === "bigint") J = `BigInt must be ${$.exact ? "exactly" : $.inclusive ? "less than or equal to" : "less than"} ${$.maximum}`;
      else if ($.type === "date") J = `Date must be ${$.exact ? "exactly" : $.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(Number($.maximum))}`;
      else J = "Invalid input";
      break;
    case b.custom:
      J = "Invalid input";
      break;
    case b.invalid_intersection_types:
      J = "Intersection results could not be merged";
      break;
    case b.not_multiple_of:
      J = `Number must be a multiple of ${$.multipleOf}`;
      break;
    case b.not_finite:
      J = "Number must be finite";
      break;
    default:
      J = X.defaultError, X$.assertNever($);
  }
  return { message: J };
};
var h4 = kA;
var _A = h4;
function HX() {
  return _A;
}
var aJ = ($) => {
  let { data: X, path: J, errorMaps: Q, issueData: Y } = $, W = [...J, ...Y.path || []], z = { ...Y, path: W };
  if (Y.message !== void 0) return { ...Y, path: W, message: Y.message };
  let G = "", U = Q.filter((H) => !!H).slice().reverse();
  for (let H of U) G = H(z, { data: X, defaultError: G }).message;
  return { ...Y, path: W, message: G };
};
function C($, X) {
  let J = HX(), Q = aJ({ issueData: X, data: $.data, path: $.path, errorMaps: [$.common.contextualErrorMap, $.schemaErrorMap, J, J === h4 ? void 0 : h4].filter((Y) => !!Y) });
  $.common.issues.push(Q);
}
var c$ = class _c$ {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid") this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted") this.value = "aborted";
  }
  static mergeArray($, X) {
    let J = [];
    for (let Q of X) {
      if (Q.status === "aborted") return l;
      if (Q.status === "dirty") $.dirty();
      J.push(Q.value);
    }
    return { status: $.value, value: J };
  }
  static async mergeObjectAsync($, X) {
    let J = [];
    for (let Q of X) {
      let Y = await Q.key, W = await Q.value;
      J.push({ key: Y, value: W });
    }
    return _c$.mergeObjectSync($, J);
  }
  static mergeObjectSync($, X) {
    let J = {};
    for (let Q of X) {
      let { key: Y, value: W } = Q;
      if (Y.status === "aborted") return l;
      if (W.status === "aborted") return l;
      if (Y.status === "dirty") $.dirty();
      if (W.status === "dirty") $.dirty();
      if (Y.value !== "__proto__" && (typeof W.value < "u" || Q.alwaysSet)) J[Y.value] = W.value;
    }
    return { status: $.value, value: J };
  }
};
var l = Object.freeze({ status: "aborted" });
var L0 = ($) => ({ status: "dirty", value: $ });
var t$ = ($) => ({ status: "valid", value: $ });
var AW = ($) => $.status === "aborted";
var IW = ($) => $.status === "dirty";
var I1 = ($) => $.status === "valid";
var KX = ($) => typeof Promise < "u" && $ instanceof Promise;
var f;
(function($) {
  $.errToObj = (X) => typeof X === "string" ? { message: X } : X || {}, $.toString = (X) => typeof X === "string" ? X : X?.message;
})(f || (f = {}));
var y6 = class {
  constructor($, X, J, Q) {
    this._cachedPath = [], this.parent = $, this.data = X, this._path = J, this._key = Q;
  }
  get path() {
    if (!this._cachedPath.length) if (Array.isArray(this._key)) this._cachedPath.push(...this._path, ...this._key);
    else this._cachedPath.push(...this._path, this._key);
    return this._cachedPath;
  }
};
var mV = ($, X) => {
  if (I1(X)) return { success: true, data: X.value };
  else {
    if (!$.common.issues.length) throw Error("Validation failed but no issues detected.");
    return { success: false, get error() {
      if (this._error) return this._error;
      let J = new L6($.common.issues);
      return this._error = J, this._error;
    } };
  }
};
function o($) {
  if (!$) return {};
  let { errorMap: X, invalid_type_error: J, required_error: Q, description: Y } = $;
  if (X && (J || Q)) throw Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  if (X) return { errorMap: X, description: Y };
  return { errorMap: (z, G) => {
    let { message: U } = $;
    if (z.code === "invalid_enum_value") return { message: U ?? G.defaultError };
    if (typeof G.data > "u") return { message: U ?? Q ?? G.defaultError };
    if (z.code !== "invalid_type") return { message: G.defaultError };
    return { message: U ?? J ?? G.defaultError };
  }, description: Y };
}
var e = class {
  get description() {
    return this._def.description;
  }
  _getType($) {
    return N4($.data);
  }
  _getOrReturnCtx($, X) {
    return X || { common: $.parent.common, data: $.data, parsedType: N4($.data), schemaErrorMap: this._def.errorMap, path: $.path, parent: $.parent };
  }
  _processInputParams($) {
    return { status: new c$(), ctx: { common: $.parent.common, data: $.data, parsedType: N4($.data), schemaErrorMap: this._def.errorMap, path: $.path, parent: $.parent } };
  }
  _parseSync($) {
    let X = this._parse($);
    if (KX(X)) throw Error("Synchronous parse encountered promise.");
    return X;
  }
  _parseAsync($) {
    let X = this._parse($);
    return Promise.resolve(X);
  }
  parse($, X) {
    let J = this.safeParse($, X);
    if (J.success) return J.data;
    throw J.error;
  }
  safeParse($, X) {
    let J = { common: { issues: [], async: X?.async ?? false, contextualErrorMap: X?.errorMap }, path: X?.path || [], schemaErrorMap: this._def.errorMap, parent: null, data: $, parsedType: N4($) }, Q = this._parseSync({ data: $, path: J.path, parent: J });
    return mV(J, Q);
  }
  "~validate"($) {
    let X = { common: { issues: [], async: !!this["~standard"].async }, path: [], schemaErrorMap: this._def.errorMap, parent: null, data: $, parsedType: N4($) };
    if (!this["~standard"].async) try {
      let J = this._parseSync({ data: $, path: [], parent: X });
      return I1(J) ? { value: J.value } : { issues: X.common.issues };
    } catch (J) {
      if (J?.message?.toLowerCase()?.includes("encountered")) this["~standard"].async = true;
      X.common = { issues: [], async: true };
    }
    return this._parseAsync({ data: $, path: [], parent: X }).then((J) => I1(J) ? { value: J.value } : { issues: X.common.issues });
  }
  async parseAsync($, X) {
    let J = await this.safeParseAsync($, X);
    if (J.success) return J.data;
    throw J.error;
  }
  async safeParseAsync($, X) {
    let J = { common: { issues: [], contextualErrorMap: X?.errorMap, async: true }, path: X?.path || [], schemaErrorMap: this._def.errorMap, parent: null, data: $, parsedType: N4($) }, Q = this._parse({ data: $, path: J.path, parent: J }), Y = await (KX(Q) ? Q : Promise.resolve(Q));
    return mV(J, Y);
  }
  refine($, X) {
    let J = (Q) => {
      if (typeof X === "string" || typeof X > "u") return { message: X };
      else if (typeof X === "function") return X(Q);
      else return X;
    };
    return this._refinement((Q, Y) => {
      let W = $(Q), z = () => Y.addIssue({ code: b.custom, ...J(Q) });
      if (typeof Promise < "u" && W instanceof Promise) return W.then((G) => {
        if (!G) return z(), false;
        else return true;
      });
      if (!W) return z(), false;
      else return true;
    });
  }
  refinement($, X) {
    return this._refinement((J, Q) => {
      if (!$(J)) return Q.addIssue(typeof X === "function" ? X(J, Q) : X), false;
      else return true;
    });
  }
  _refinement($) {
    return new t6({ schema: this, typeName: Z.ZodEffects, effect: { type: "refinement", refinement: $ } });
  }
  superRefine($) {
    return this._refinement($);
  }
  constructor($) {
    this.spa = this.safeParseAsync, this._def = $, this.parse = this.parse.bind(this), this.safeParse = this.safeParse.bind(this), this.parseAsync = this.parseAsync.bind(this), this.safeParseAsync = this.safeParseAsync.bind(this), this.spa = this.spa.bind(this), this.refine = this.refine.bind(this), this.refinement = this.refinement.bind(this), this.superRefine = this.superRefine.bind(this), this.optional = this.optional.bind(this), this.nullable = this.nullable.bind(this), this.nullish = this.nullish.bind(this), this.array = this.array.bind(this), this.promise = this.promise.bind(this), this.or = this.or.bind(this), this.and = this.and.bind(this), this.transform = this.transform.bind(this), this.brand = this.brand.bind(this), this.default = this.default.bind(this), this.catch = this.catch.bind(this), this.describe = this.describe.bind(this), this.pipe = this.pipe.bind(this), this.readonly = this.readonly.bind(this), this.isNullable = this.isNullable.bind(this), this.isOptional = this.isOptional.bind(this), this["~standard"] = { version: 1, vendor: "zod", validate: (X) => this["~validate"](X) };
  }
  optional() {
    return I6.create(this, this._def);
  }
  nullable() {
    return u4.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return o6.create(this);
  }
  promise() {
    return A0.create(this, this._def);
  }
  or($) {
    return BX.create([this, $], this._def);
  }
  and($) {
    return qX.create(this, $, this._def);
  }
  transform($) {
    return new t6({ ...o(this._def), schema: this, typeName: Z.ZodEffects, effect: { type: "transform", transform: $ } });
  }
  default($) {
    let X = typeof $ === "function" ? $ : () => $;
    return new FX({ ...o(this._def), innerType: this, defaultValue: X, typeName: Z.ZodDefault });
  }
  brand() {
    return new RW({ typeName: Z.ZodBranded, type: this, ...o(this._def) });
  }
  catch($) {
    let X = typeof $ === "function" ? $ : () => $;
    return new MX({ ...o(this._def), innerType: this, catchValue: X, typeName: Z.ZodCatch });
  }
  describe($) {
    return new this.constructor({ ...this._def, description: $ });
  }
  pipe($) {
    return WY.create(this, $);
  }
  readonly() {
    return AX.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var xA = /^c[^\s-]{8,}$/i;
var TA = /^[0-9a-z]+$/;
var yA = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var fA = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var gA = /^[a-z0-9_-]{21}$/i;
var hA = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var uA = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var mA = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var lA = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$";
var bW;
var cA = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var pA = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var dA = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var iA = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var nA = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var rA = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var lV = "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))";
var oA = new RegExp(`^${lV}$`);
function cV($) {
  let X = "[0-5]\\d";
  if ($.precision) X = `${X}\\.\\d{${$.precision}}`;
  else if ($.precision == null) X = `${X}(\\.\\d+)?`;
  let J = $.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${X})${J}`;
}
function tA($) {
  return new RegExp(`^${cV($)}$`);
}
function aA($) {
  let X = `${lV}T${cV($)}`, J = [];
  if (J.push($.local ? "Z?" : "Z"), $.offset) J.push("([+-]\\d{2}:?\\d{2})");
  return X = `${X}(${J.join("|")})`, new RegExp(`^${X}$`);
}
function sA($, X) {
  if ((X === "v4" || !X) && cA.test($)) return true;
  if ((X === "v6" || !X) && dA.test($)) return true;
  return false;
}
function eA($, X) {
  if (!hA.test($)) return false;
  try {
    let [J] = $.split(".");
    if (!J) return false;
    let Q = J.replace(/-/g, "+").replace(/_/g, "/").padEnd(J.length + (4 - J.length % 4) % 4, "="), Y = JSON.parse(atob(Q));
    if (typeof Y !== "object" || Y === null) return false;
    if ("typ" in Y && Y?.typ !== "JWT") return false;
    if (!Y.alg) return false;
    if (X && Y.alg !== X) return false;
    return true;
  } catch {
    return false;
  }
}
function $I($, X) {
  if ((X === "v4" || !X) && pA.test($)) return true;
  if ((X === "v6" || !X) && iA.test($)) return true;
  return false;
}
var w4 = class _w4 extends e {
  _parse($) {
    if (this._def.coerce) $.data = String($.data);
    if (this._getType($) !== E.string) {
      let Y = this._getOrReturnCtx($);
      return C(Y, { code: b.invalid_type, expected: E.string, received: Y.parsedType }), l;
    }
    let J = new c$(), Q = void 0;
    for (let Y of this._def.checks) if (Y.kind === "min") {
      if ($.data.length < Y.value) Q = this._getOrReturnCtx($, Q), C(Q, { code: b.too_small, minimum: Y.value, type: "string", inclusive: true, exact: false, message: Y.message }), J.dirty();
    } else if (Y.kind === "max") {
      if ($.data.length > Y.value) Q = this._getOrReturnCtx($, Q), C(Q, { code: b.too_big, maximum: Y.value, type: "string", inclusive: true, exact: false, message: Y.message }), J.dirty();
    } else if (Y.kind === "length") {
      let W = $.data.length > Y.value, z = $.data.length < Y.value;
      if (W || z) {
        if (Q = this._getOrReturnCtx($, Q), W) C(Q, { code: b.too_big, maximum: Y.value, type: "string", inclusive: true, exact: true, message: Y.message });
        else if (z) C(Q, { code: b.too_small, minimum: Y.value, type: "string", inclusive: true, exact: true, message: Y.message });
        J.dirty();
      }
    } else if (Y.kind === "email") {
      if (!mA.test($.data)) Q = this._getOrReturnCtx($, Q), C(Q, { validation: "email", code: b.invalid_string, message: Y.message }), J.dirty();
    } else if (Y.kind === "emoji") {
      if (!bW) bW = new RegExp(lA, "u");
      if (!bW.test($.data)) Q = this._getOrReturnCtx($, Q), C(Q, { validation: "emoji", code: b.invalid_string, message: Y.message }), J.dirty();
    } else if (Y.kind === "uuid") {
      if (!fA.test($.data)) Q = this._getOrReturnCtx($, Q), C(Q, { validation: "uuid", code: b.invalid_string, message: Y.message }), J.dirty();
    } else if (Y.kind === "nanoid") {
      if (!gA.test($.data)) Q = this._getOrReturnCtx($, Q), C(Q, { validation: "nanoid", code: b.invalid_string, message: Y.message }), J.dirty();
    } else if (Y.kind === "cuid") {
      if (!xA.test($.data)) Q = this._getOrReturnCtx($, Q), C(Q, { validation: "cuid", code: b.invalid_string, message: Y.message }), J.dirty();
    } else if (Y.kind === "cuid2") {
      if (!TA.test($.data)) Q = this._getOrReturnCtx($, Q), C(Q, { validation: "cuid2", code: b.invalid_string, message: Y.message }), J.dirty();
    } else if (Y.kind === "ulid") {
      if (!yA.test($.data)) Q = this._getOrReturnCtx($, Q), C(Q, { validation: "ulid", code: b.invalid_string, message: Y.message }), J.dirty();
    } else if (Y.kind === "url") try {
      new URL($.data);
    } catch {
      Q = this._getOrReturnCtx($, Q), C(Q, { validation: "url", code: b.invalid_string, message: Y.message }), J.dirty();
    }
    else if (Y.kind === "regex") {
      if (Y.regex.lastIndex = 0, !Y.regex.test($.data)) Q = this._getOrReturnCtx($, Q), C(Q, { validation: "regex", code: b.invalid_string, message: Y.message }), J.dirty();
    } else if (Y.kind === "trim") $.data = $.data.trim();
    else if (Y.kind === "includes") {
      if (!$.data.includes(Y.value, Y.position)) Q = this._getOrReturnCtx($, Q), C(Q, { code: b.invalid_string, validation: { includes: Y.value, position: Y.position }, message: Y.message }), J.dirty();
    } else if (Y.kind === "toLowerCase") $.data = $.data.toLowerCase();
    else if (Y.kind === "toUpperCase") $.data = $.data.toUpperCase();
    else if (Y.kind === "startsWith") {
      if (!$.data.startsWith(Y.value)) Q = this._getOrReturnCtx($, Q), C(Q, { code: b.invalid_string, validation: { startsWith: Y.value }, message: Y.message }), J.dirty();
    } else if (Y.kind === "endsWith") {
      if (!$.data.endsWith(Y.value)) Q = this._getOrReturnCtx($, Q), C(Q, { code: b.invalid_string, validation: { endsWith: Y.value }, message: Y.message }), J.dirty();
    } else if (Y.kind === "datetime") {
      if (!aA(Y).test($.data)) Q = this._getOrReturnCtx($, Q), C(Q, { code: b.invalid_string, validation: "datetime", message: Y.message }), J.dirty();
    } else if (Y.kind === "date") {
      if (!oA.test($.data)) Q = this._getOrReturnCtx($, Q), C(Q, { code: b.invalid_string, validation: "date", message: Y.message }), J.dirty();
    } else if (Y.kind === "time") {
      if (!tA(Y).test($.data)) Q = this._getOrReturnCtx($, Q), C(Q, { code: b.invalid_string, validation: "time", message: Y.message }), J.dirty();
    } else if (Y.kind === "duration") {
      if (!uA.test($.data)) Q = this._getOrReturnCtx($, Q), C(Q, { validation: "duration", code: b.invalid_string, message: Y.message }), J.dirty();
    } else if (Y.kind === "ip") {
      if (!sA($.data, Y.version)) Q = this._getOrReturnCtx($, Q), C(Q, { validation: "ip", code: b.invalid_string, message: Y.message }), J.dirty();
    } else if (Y.kind === "jwt") {
      if (!eA($.data, Y.alg)) Q = this._getOrReturnCtx($, Q), C(Q, { validation: "jwt", code: b.invalid_string, message: Y.message }), J.dirty();
    } else if (Y.kind === "cidr") {
      if (!$I($.data, Y.version)) Q = this._getOrReturnCtx($, Q), C(Q, { validation: "cidr", code: b.invalid_string, message: Y.message }), J.dirty();
    } else if (Y.kind === "base64") {
      if (!nA.test($.data)) Q = this._getOrReturnCtx($, Q), C(Q, { validation: "base64", code: b.invalid_string, message: Y.message }), J.dirty();
    } else if (Y.kind === "base64url") {
      if (!rA.test($.data)) Q = this._getOrReturnCtx($, Q), C(Q, { validation: "base64url", code: b.invalid_string, message: Y.message }), J.dirty();
    } else X$.assertNever(Y);
    return { status: J.value, value: $.data };
  }
  _regex($, X, J) {
    return this.refinement((Q) => $.test(Q), { validation: X, code: b.invalid_string, ...f.errToObj(J) });
  }
  _addCheck($) {
    return new _w4({ ...this._def, checks: [...this._def.checks, $] });
  }
  email($) {
    return this._addCheck({ kind: "email", ...f.errToObj($) });
  }
  url($) {
    return this._addCheck({ kind: "url", ...f.errToObj($) });
  }
  emoji($) {
    return this._addCheck({ kind: "emoji", ...f.errToObj($) });
  }
  uuid($) {
    return this._addCheck({ kind: "uuid", ...f.errToObj($) });
  }
  nanoid($) {
    return this._addCheck({ kind: "nanoid", ...f.errToObj($) });
  }
  cuid($) {
    return this._addCheck({ kind: "cuid", ...f.errToObj($) });
  }
  cuid2($) {
    return this._addCheck({ kind: "cuid2", ...f.errToObj($) });
  }
  ulid($) {
    return this._addCheck({ kind: "ulid", ...f.errToObj($) });
  }
  base64($) {
    return this._addCheck({ kind: "base64", ...f.errToObj($) });
  }
  base64url($) {
    return this._addCheck({ kind: "base64url", ...f.errToObj($) });
  }
  jwt($) {
    return this._addCheck({ kind: "jwt", ...f.errToObj($) });
  }
  ip($) {
    return this._addCheck({ kind: "ip", ...f.errToObj($) });
  }
  cidr($) {
    return this._addCheck({ kind: "cidr", ...f.errToObj($) });
  }
  datetime($) {
    if (typeof $ === "string") return this._addCheck({ kind: "datetime", precision: null, offset: false, local: false, message: $ });
    return this._addCheck({ kind: "datetime", precision: typeof $?.precision > "u" ? null : $?.precision, offset: $?.offset ?? false, local: $?.local ?? false, ...f.errToObj($?.message) });
  }
  date($) {
    return this._addCheck({ kind: "date", message: $ });
  }
  time($) {
    if (typeof $ === "string") return this._addCheck({ kind: "time", precision: null, message: $ });
    return this._addCheck({ kind: "time", precision: typeof $?.precision > "u" ? null : $?.precision, ...f.errToObj($?.message) });
  }
  duration($) {
    return this._addCheck({ kind: "duration", ...f.errToObj($) });
  }
  regex($, X) {
    return this._addCheck({ kind: "regex", regex: $, ...f.errToObj(X) });
  }
  includes($, X) {
    return this._addCheck({ kind: "includes", value: $, position: X?.position, ...f.errToObj(X?.message) });
  }
  startsWith($, X) {
    return this._addCheck({ kind: "startsWith", value: $, ...f.errToObj(X) });
  }
  endsWith($, X) {
    return this._addCheck({ kind: "endsWith", value: $, ...f.errToObj(X) });
  }
  min($, X) {
    return this._addCheck({ kind: "min", value: $, ...f.errToObj(X) });
  }
  max($, X) {
    return this._addCheck({ kind: "max", value: $, ...f.errToObj(X) });
  }
  length($, X) {
    return this._addCheck({ kind: "length", value: $, ...f.errToObj(X) });
  }
  nonempty($) {
    return this.min(1, f.errToObj($));
  }
  trim() {
    return new _w4({ ...this._def, checks: [...this._def.checks, { kind: "trim" }] });
  }
  toLowerCase() {
    return new _w4({ ...this._def, checks: [...this._def.checks, { kind: "toLowerCase" }] });
  }
  toUpperCase() {
    return new _w4({ ...this._def, checks: [...this._def.checks, { kind: "toUpperCase" }] });
  }
  get isDatetime() {
    return !!this._def.checks.find(($) => $.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find(($) => $.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find(($) => $.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find(($) => $.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find(($) => $.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find(($) => $.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find(($) => $.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find(($) => $.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find(($) => $.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find(($) => $.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find(($) => $.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find(($) => $.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find(($) => $.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find(($) => $.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find(($) => $.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find(($) => $.kind === "base64url");
  }
  get minLength() {
    let $ = null;
    for (let X of this._def.checks) if (X.kind === "min") {
      if ($ === null || X.value > $) $ = X.value;
    }
    return $;
  }
  get maxLength() {
    let $ = null;
    for (let X of this._def.checks) if (X.kind === "max") {
      if ($ === null || X.value < $) $ = X.value;
    }
    return $;
  }
};
w4.create = ($) => {
  return new w4({ checks: [], typeName: Z.ZodString, coerce: $?.coerce ?? false, ...o($) });
};
function XI($, X) {
  let J = ($.toString().split(".")[1] || "").length, Q = (X.toString().split(".")[1] || "").length, Y = J > Q ? J : Q, W = Number.parseInt($.toFixed(Y).replace(".", "")), z = Number.parseInt(X.toFixed(Y).replace(".", ""));
  return W % z / 10 ** Y;
}
var j0 = class _j0 extends e {
  constructor() {
    super(...arguments);
    this.min = this.gte, this.max = this.lte, this.step = this.multipleOf;
  }
  _parse($) {
    if (this._def.coerce) $.data = Number($.data);
    if (this._getType($) !== E.number) {
      let Y = this._getOrReturnCtx($);
      return C(Y, { code: b.invalid_type, expected: E.number, received: Y.parsedType }), l;
    }
    let J = void 0, Q = new c$();
    for (let Y of this._def.checks) if (Y.kind === "int") {
      if (!X$.isInteger($.data)) J = this._getOrReturnCtx($, J), C(J, { code: b.invalid_type, expected: "integer", received: "float", message: Y.message }), Q.dirty();
    } else if (Y.kind === "min") {
      if (Y.inclusive ? $.data < Y.value : $.data <= Y.value) J = this._getOrReturnCtx($, J), C(J, { code: b.too_small, minimum: Y.value, type: "number", inclusive: Y.inclusive, exact: false, message: Y.message }), Q.dirty();
    } else if (Y.kind === "max") {
      if (Y.inclusive ? $.data > Y.value : $.data >= Y.value) J = this._getOrReturnCtx($, J), C(J, { code: b.too_big, maximum: Y.value, type: "number", inclusive: Y.inclusive, exact: false, message: Y.message }), Q.dirty();
    } else if (Y.kind === "multipleOf") {
      if (XI($.data, Y.value) !== 0) J = this._getOrReturnCtx($, J), C(J, { code: b.not_multiple_of, multipleOf: Y.value, message: Y.message }), Q.dirty();
    } else if (Y.kind === "finite") {
      if (!Number.isFinite($.data)) J = this._getOrReturnCtx($, J), C(J, { code: b.not_finite, message: Y.message }), Q.dirty();
    } else X$.assertNever(Y);
    return { status: Q.value, value: $.data };
  }
  gte($, X) {
    return this.setLimit("min", $, true, f.toString(X));
  }
  gt($, X) {
    return this.setLimit("min", $, false, f.toString(X));
  }
  lte($, X) {
    return this.setLimit("max", $, true, f.toString(X));
  }
  lt($, X) {
    return this.setLimit("max", $, false, f.toString(X));
  }
  setLimit($, X, J, Q) {
    return new _j0({ ...this._def, checks: [...this._def.checks, { kind: $, value: X, inclusive: J, message: f.toString(Q) }] });
  }
  _addCheck($) {
    return new _j0({ ...this._def, checks: [...this._def.checks, $] });
  }
  int($) {
    return this._addCheck({ kind: "int", message: f.toString($) });
  }
  positive($) {
    return this._addCheck({ kind: "min", value: 0, inclusive: false, message: f.toString($) });
  }
  negative($) {
    return this._addCheck({ kind: "max", value: 0, inclusive: false, message: f.toString($) });
  }
  nonpositive($) {
    return this._addCheck({ kind: "max", value: 0, inclusive: true, message: f.toString($) });
  }
  nonnegative($) {
    return this._addCheck({ kind: "min", value: 0, inclusive: true, message: f.toString($) });
  }
  multipleOf($, X) {
    return this._addCheck({ kind: "multipleOf", value: $, message: f.toString(X) });
  }
  finite($) {
    return this._addCheck({ kind: "finite", message: f.toString($) });
  }
  safe($) {
    return this._addCheck({ kind: "min", inclusive: true, value: Number.MIN_SAFE_INTEGER, message: f.toString($) })._addCheck({ kind: "max", inclusive: true, value: Number.MAX_SAFE_INTEGER, message: f.toString($) });
  }
  get minValue() {
    let $ = null;
    for (let X of this._def.checks) if (X.kind === "min") {
      if ($ === null || X.value > $) $ = X.value;
    }
    return $;
  }
  get maxValue() {
    let $ = null;
    for (let X of this._def.checks) if (X.kind === "max") {
      if ($ === null || X.value < $) $ = X.value;
    }
    return $;
  }
  get isInt() {
    return !!this._def.checks.find(($) => $.kind === "int" || $.kind === "multipleOf" && X$.isInteger($.value));
  }
  get isFinite() {
    let $ = null, X = null;
    for (let J of this._def.checks) if (J.kind === "finite" || J.kind === "int" || J.kind === "multipleOf") return true;
    else if (J.kind === "min") {
      if (X === null || J.value > X) X = J.value;
    } else if (J.kind === "max") {
      if ($ === null || J.value < $) $ = J.value;
    }
    return Number.isFinite(X) && Number.isFinite($);
  }
};
j0.create = ($) => {
  return new j0({ checks: [], typeName: Z.ZodNumber, coerce: $?.coerce || false, ...o($) });
};
var F0 = class _F0 extends e {
  constructor() {
    super(...arguments);
    this.min = this.gte, this.max = this.lte;
  }
  _parse($) {
    if (this._def.coerce) try {
      $.data = BigInt($.data);
    } catch {
      return this._getInvalidInput($);
    }
    if (this._getType($) !== E.bigint) return this._getInvalidInput($);
    let J = void 0, Q = new c$();
    for (let Y of this._def.checks) if (Y.kind === "min") {
      if (Y.inclusive ? $.data < Y.value : $.data <= Y.value) J = this._getOrReturnCtx($, J), C(J, { code: b.too_small, type: "bigint", minimum: Y.value, inclusive: Y.inclusive, message: Y.message }), Q.dirty();
    } else if (Y.kind === "max") {
      if (Y.inclusive ? $.data > Y.value : $.data >= Y.value) J = this._getOrReturnCtx($, J), C(J, { code: b.too_big, type: "bigint", maximum: Y.value, inclusive: Y.inclusive, message: Y.message }), Q.dirty();
    } else if (Y.kind === "multipleOf") {
      if ($.data % Y.value !== BigInt(0)) J = this._getOrReturnCtx($, J), C(J, { code: b.not_multiple_of, multipleOf: Y.value, message: Y.message }), Q.dirty();
    } else X$.assertNever(Y);
    return { status: Q.value, value: $.data };
  }
  _getInvalidInput($) {
    let X = this._getOrReturnCtx($);
    return C(X, { code: b.invalid_type, expected: E.bigint, received: X.parsedType }), l;
  }
  gte($, X) {
    return this.setLimit("min", $, true, f.toString(X));
  }
  gt($, X) {
    return this.setLimit("min", $, false, f.toString(X));
  }
  lte($, X) {
    return this.setLimit("max", $, true, f.toString(X));
  }
  lt($, X) {
    return this.setLimit("max", $, false, f.toString(X));
  }
  setLimit($, X, J, Q) {
    return new _F0({ ...this._def, checks: [...this._def.checks, { kind: $, value: X, inclusive: J, message: f.toString(Q) }] });
  }
  _addCheck($) {
    return new _F0({ ...this._def, checks: [...this._def.checks, $] });
  }
  positive($) {
    return this._addCheck({ kind: "min", value: BigInt(0), inclusive: false, message: f.toString($) });
  }
  negative($) {
    return this._addCheck({ kind: "max", value: BigInt(0), inclusive: false, message: f.toString($) });
  }
  nonpositive($) {
    return this._addCheck({ kind: "max", value: BigInt(0), inclusive: true, message: f.toString($) });
  }
  nonnegative($) {
    return this._addCheck({ kind: "min", value: BigInt(0), inclusive: true, message: f.toString($) });
  }
  multipleOf($, X) {
    return this._addCheck({ kind: "multipleOf", value: $, message: f.toString(X) });
  }
  get minValue() {
    let $ = null;
    for (let X of this._def.checks) if (X.kind === "min") {
      if ($ === null || X.value > $) $ = X.value;
    }
    return $;
  }
  get maxValue() {
    let $ = null;
    for (let X of this._def.checks) if (X.kind === "max") {
      if ($ === null || X.value < $) $ = X.value;
    }
    return $;
  }
};
F0.create = ($) => {
  return new F0({ checks: [], typeName: Z.ZodBigInt, coerce: $?.coerce ?? false, ...o($) });
};
var sJ = class extends e {
  _parse($) {
    if (this._def.coerce) $.data = Boolean($.data);
    if (this._getType($) !== E.boolean) {
      let J = this._getOrReturnCtx($);
      return C(J, { code: b.invalid_type, expected: E.boolean, received: J.parsedType }), l;
    }
    return t$($.data);
  }
};
sJ.create = ($) => {
  return new sJ({ typeName: Z.ZodBoolean, coerce: $?.coerce || false, ...o($) });
};
var NX = class _NX extends e {
  _parse($) {
    if (this._def.coerce) $.data = new Date($.data);
    if (this._getType($) !== E.date) {
      let Y = this._getOrReturnCtx($);
      return C(Y, { code: b.invalid_type, expected: E.date, received: Y.parsedType }), l;
    }
    if (Number.isNaN($.data.getTime())) {
      let Y = this._getOrReturnCtx($);
      return C(Y, { code: b.invalid_date }), l;
    }
    let J = new c$(), Q = void 0;
    for (let Y of this._def.checks) if (Y.kind === "min") {
      if ($.data.getTime() < Y.value) Q = this._getOrReturnCtx($, Q), C(Q, { code: b.too_small, message: Y.message, inclusive: true, exact: false, minimum: Y.value, type: "date" }), J.dirty();
    } else if (Y.kind === "max") {
      if ($.data.getTime() > Y.value) Q = this._getOrReturnCtx($, Q), C(Q, { code: b.too_big, message: Y.message, inclusive: true, exact: false, maximum: Y.value, type: "date" }), J.dirty();
    } else X$.assertNever(Y);
    return { status: J.value, value: new Date($.data.getTime()) };
  }
  _addCheck($) {
    return new _NX({ ...this._def, checks: [...this._def.checks, $] });
  }
  min($, X) {
    return this._addCheck({ kind: "min", value: $.getTime(), message: f.toString(X) });
  }
  max($, X) {
    return this._addCheck({ kind: "max", value: $.getTime(), message: f.toString(X) });
  }
  get minDate() {
    let $ = null;
    for (let X of this._def.checks) if (X.kind === "min") {
      if ($ === null || X.value > $) $ = X.value;
    }
    return $ != null ? new Date($) : null;
  }
  get maxDate() {
    let $ = null;
    for (let X of this._def.checks) if (X.kind === "max") {
      if ($ === null || X.value < $) $ = X.value;
    }
    return $ != null ? new Date($) : null;
  }
};
NX.create = ($) => {
  return new NX({ checks: [], coerce: $?.coerce || false, typeName: Z.ZodDate, ...o($) });
};
var eJ = class extends e {
  _parse($) {
    if (this._getType($) !== E.symbol) {
      let J = this._getOrReturnCtx($);
      return C(J, { code: b.invalid_type, expected: E.symbol, received: J.parsedType }), l;
    }
    return t$($.data);
  }
};
eJ.create = ($) => {
  return new eJ({ typeName: Z.ZodSymbol, ...o($) });
};
var OX = class extends e {
  _parse($) {
    if (this._getType($) !== E.undefined) {
      let J = this._getOrReturnCtx($);
      return C(J, { code: b.invalid_type, expected: E.undefined, received: J.parsedType }), l;
    }
    return t$($.data);
  }
};
OX.create = ($) => {
  return new OX({ typeName: Z.ZodUndefined, ...o($) });
};
var wX = class extends e {
  _parse($) {
    if (this._getType($) !== E.null) {
      let J = this._getOrReturnCtx($);
      return C(J, { code: b.invalid_type, expected: E.null, received: J.parsedType }), l;
    }
    return t$($.data);
  }
};
wX.create = ($) => {
  return new wX({ typeName: Z.ZodNull, ...o($) });
};
var $Y = class extends e {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse($) {
    return t$($.data);
  }
};
$Y.create = ($) => {
  return new $Y({ typeName: Z.ZodAny, ...o($) });
};
var b1 = class extends e {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse($) {
    return t$($.data);
  }
};
b1.create = ($) => {
  return new b1({ typeName: Z.ZodUnknown, ...o($) });
};
var B4 = class extends e {
  _parse($) {
    let X = this._getOrReturnCtx($);
    return C(X, { code: b.invalid_type, expected: E.never, received: X.parsedType }), l;
  }
};
B4.create = ($) => {
  return new B4({ typeName: Z.ZodNever, ...o($) });
};
var XY = class extends e {
  _parse($) {
    if (this._getType($) !== E.undefined) {
      let J = this._getOrReturnCtx($);
      return C(J, { code: b.invalid_type, expected: E.void, received: J.parsedType }), l;
    }
    return t$($.data);
  }
};
XY.create = ($) => {
  return new XY({ typeName: Z.ZodVoid, ...o($) });
};
var o6 = class _o6 extends e {
  _parse($) {
    let { ctx: X, status: J } = this._processInputParams($), Q = this._def;
    if (X.parsedType !== E.array) return C(X, { code: b.invalid_type, expected: E.array, received: X.parsedType }), l;
    if (Q.exactLength !== null) {
      let W = X.data.length > Q.exactLength.value, z = X.data.length < Q.exactLength.value;
      if (W || z) C(X, { code: W ? b.too_big : b.too_small, minimum: z ? Q.exactLength.value : void 0, maximum: W ? Q.exactLength.value : void 0, type: "array", inclusive: true, exact: true, message: Q.exactLength.message }), J.dirty();
    }
    if (Q.minLength !== null) {
      if (X.data.length < Q.minLength.value) C(X, { code: b.too_small, minimum: Q.minLength.value, type: "array", inclusive: true, exact: false, message: Q.minLength.message }), J.dirty();
    }
    if (Q.maxLength !== null) {
      if (X.data.length > Q.maxLength.value) C(X, { code: b.too_big, maximum: Q.maxLength.value, type: "array", inclusive: true, exact: false, message: Q.maxLength.message }), J.dirty();
    }
    if (X.common.async) return Promise.all([...X.data].map((W, z) => {
      return Q.type._parseAsync(new y6(X, W, X.path, z));
    })).then((W) => {
      return c$.mergeArray(J, W);
    });
    let Y = [...X.data].map((W, z) => {
      return Q.type._parseSync(new y6(X, W, X.path, z));
    });
    return c$.mergeArray(J, Y);
  }
  get element() {
    return this._def.type;
  }
  min($, X) {
    return new _o6({ ...this._def, minLength: { value: $, message: f.toString(X) } });
  }
  max($, X) {
    return new _o6({ ...this._def, maxLength: { value: $, message: f.toString(X) } });
  }
  length($, X) {
    return new _o6({ ...this._def, exactLength: { value: $, message: f.toString(X) } });
  }
  nonempty($) {
    return this.min(1, $);
  }
};
o6.create = ($, X) => {
  return new o6({ type: $, minLength: null, maxLength: null, exactLength: null, typeName: Z.ZodArray, ...o(X) });
};
function D0($) {
  if ($ instanceof R$) {
    let X = {};
    for (let J in $.shape) {
      let Q = $.shape[J];
      X[J] = I6.create(D0(Q));
    }
    return new R$({ ...$._def, shape: () => X });
  } else if ($ instanceof o6) return new o6({ ...$._def, type: D0($.element) });
  else if ($ instanceof I6) return I6.create(D0($.unwrap()));
  else if ($ instanceof u4) return u4.create(D0($.unwrap()));
  else if ($ instanceof q4) return q4.create($.items.map((X) => D0(X)));
  else return $;
}
var R$ = class _R$ extends e {
  constructor() {
    super(...arguments);
    this._cached = null, this.nonstrict = this.passthrough, this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null) return this._cached;
    let $ = this._def.shape(), X = X$.objectKeys($);
    return this._cached = { shape: $, keys: X }, this._cached;
  }
  _parse($) {
    if (this._getType($) !== E.object) {
      let U = this._getOrReturnCtx($);
      return C(U, { code: b.invalid_type, expected: E.object, received: U.parsedType }), l;
    }
    let { status: J, ctx: Q } = this._processInputParams($), { shape: Y, keys: W } = this._getCached(), z = [];
    if (!(this._def.catchall instanceof B4 && this._def.unknownKeys === "strip")) {
      for (let U in Q.data) if (!W.includes(U)) z.push(U);
    }
    let G = [];
    for (let U of W) {
      let H = Y[U], K = Q.data[U];
      G.push({ key: { status: "valid", value: U }, value: H._parse(new y6(Q, K, Q.path, U)), alwaysSet: U in Q.data });
    }
    if (this._def.catchall instanceof B4) {
      let U = this._def.unknownKeys;
      if (U === "passthrough") for (let H of z) G.push({ key: { status: "valid", value: H }, value: { status: "valid", value: Q.data[H] } });
      else if (U === "strict") {
        if (z.length > 0) C(Q, { code: b.unrecognized_keys, keys: z }), J.dirty();
      } else if (U === "strip") ;
      else throw Error("Internal ZodObject error: invalid unknownKeys value.");
    } else {
      let U = this._def.catchall;
      for (let H of z) {
        let K = Q.data[H];
        G.push({ key: { status: "valid", value: H }, value: U._parse(new y6(Q, K, Q.path, H)), alwaysSet: H in Q.data });
      }
    }
    if (Q.common.async) return Promise.resolve().then(async () => {
      let U = [];
      for (let H of G) {
        let K = await H.key, V = await H.value;
        U.push({ key: K, value: V, alwaysSet: H.alwaysSet });
      }
      return U;
    }).then((U) => {
      return c$.mergeObjectSync(J, U);
    });
    else return c$.mergeObjectSync(J, G);
  }
  get shape() {
    return this._def.shape();
  }
  strict($) {
    return f.errToObj, new _R$({ ...this._def, unknownKeys: "strict", ...$ !== void 0 ? { errorMap: (X, J) => {
      let Q = this._def.errorMap?.(X, J).message ?? J.defaultError;
      if (X.code === "unrecognized_keys") return { message: f.errToObj($).message ?? Q };
      return { message: Q };
    } } : {} });
  }
  strip() {
    return new _R$({ ...this._def, unknownKeys: "strip" });
  }
  passthrough() {
    return new _R$({ ...this._def, unknownKeys: "passthrough" });
  }
  extend($) {
    return new _R$({ ...this._def, shape: () => ({ ...this._def.shape(), ...$ }) });
  }
  merge($) {
    return new _R$({ unknownKeys: $._def.unknownKeys, catchall: $._def.catchall, shape: () => ({ ...this._def.shape(), ...$._def.shape() }), typeName: Z.ZodObject });
  }
  setKey($, X) {
    return this.augment({ [$]: X });
  }
  catchall($) {
    return new _R$({ ...this._def, catchall: $ });
  }
  pick($) {
    let X = {};
    for (let J of X$.objectKeys($)) if ($[J] && this.shape[J]) X[J] = this.shape[J];
    return new _R$({ ...this._def, shape: () => X });
  }
  omit($) {
    let X = {};
    for (let J of X$.objectKeys(this.shape)) if (!$[J]) X[J] = this.shape[J];
    return new _R$({ ...this._def, shape: () => X });
  }
  deepPartial() {
    return D0(this);
  }
  partial($) {
    let X = {};
    for (let J of X$.objectKeys(this.shape)) {
      let Q = this.shape[J];
      if ($ && !$[J]) X[J] = Q;
      else X[J] = Q.optional();
    }
    return new _R$({ ...this._def, shape: () => X });
  }
  required($) {
    let X = {};
    for (let J of X$.objectKeys(this.shape)) if ($ && !$[J]) X[J] = this.shape[J];
    else {
      let Y = this.shape[J];
      while (Y instanceof I6) Y = Y._def.innerType;
      X[J] = Y;
    }
    return new _R$({ ...this._def, shape: () => X });
  }
  keyof() {
    return pV(X$.objectKeys(this.shape));
  }
};
R$.create = ($, X) => {
  return new R$({ shape: () => $, unknownKeys: "strip", catchall: B4.create(), typeName: Z.ZodObject, ...o(X) });
};
R$.strictCreate = ($, X) => {
  return new R$({ shape: () => $, unknownKeys: "strict", catchall: B4.create(), typeName: Z.ZodObject, ...o(X) });
};
R$.lazycreate = ($, X) => {
  return new R$({ shape: $, unknownKeys: "strip", catchall: B4.create(), typeName: Z.ZodObject, ...o(X) });
};
var BX = class extends e {
  _parse($) {
    let { ctx: X } = this._processInputParams($), J = this._def.options;
    function Q(Y) {
      for (let z of Y) if (z.result.status === "valid") return z.result;
      for (let z of Y) if (z.result.status === "dirty") return X.common.issues.push(...z.ctx.common.issues), z.result;
      let W = Y.map((z) => new L6(z.ctx.common.issues));
      return C(X, { code: b.invalid_union, unionErrors: W }), l;
    }
    if (X.common.async) return Promise.all(J.map(async (Y) => {
      let W = { ...X, common: { ...X.common, issues: [] }, parent: null };
      return { result: await Y._parseAsync({ data: X.data, path: X.path, parent: W }), ctx: W };
    })).then(Q);
    else {
      let Y = void 0, W = [];
      for (let G of J) {
        let U = { ...X, common: { ...X.common, issues: [] }, parent: null }, H = G._parseSync({ data: X.data, path: X.path, parent: U });
        if (H.status === "valid") return H;
        else if (H.status === "dirty" && !Y) Y = { result: H, ctx: U };
        if (U.common.issues.length) W.push(U.common.issues);
      }
      if (Y) return X.common.issues.push(...Y.ctx.common.issues), Y.result;
      let z = W.map((G) => new L6(G));
      return C(X, { code: b.invalid_union, unionErrors: z }), l;
    }
  }
  get options() {
    return this._def.options;
  }
};
BX.create = ($, X) => {
  return new BX({ options: $, typeName: Z.ZodUnion, ...o(X) });
};
var O4 = ($) => {
  if ($ instanceof LX) return O4($.schema);
  else if ($ instanceof t6) return O4($.innerType());
  else if ($ instanceof DX) return [$.value];
  else if ($ instanceof Z1) return $.options;
  else if ($ instanceof jX) return X$.objectValues($.enum);
  else if ($ instanceof FX) return O4($._def.innerType);
  else if ($ instanceof OX) return [void 0];
  else if ($ instanceof wX) return [null];
  else if ($ instanceof I6) return [void 0, ...O4($.unwrap())];
  else if ($ instanceof u4) return [null, ...O4($.unwrap())];
  else if ($ instanceof RW) return O4($.unwrap());
  else if ($ instanceof AX) return O4($.unwrap());
  else if ($ instanceof MX) return O4($._def.innerType);
  else return [];
};
var PW = class _PW extends e {
  _parse($) {
    let { ctx: X } = this._processInputParams($);
    if (X.parsedType !== E.object) return C(X, { code: b.invalid_type, expected: E.object, received: X.parsedType }), l;
    let J = this.discriminator, Q = X.data[J], Y = this.optionsMap.get(Q);
    if (!Y) return C(X, { code: b.invalid_union_discriminator, options: Array.from(this.optionsMap.keys()), path: [J] }), l;
    if (X.common.async) return Y._parseAsync({ data: X.data, path: X.path, parent: X });
    else return Y._parseSync({ data: X.data, path: X.path, parent: X });
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  static create($, X, J) {
    let Q = /* @__PURE__ */ new Map();
    for (let Y of X) {
      let W = O4(Y.shape[$]);
      if (!W.length) throw Error(`A discriminator value for key \`${$}\` could not be extracted from all schema options`);
      for (let z of W) {
        if (Q.has(z)) throw Error(`Discriminator property ${String($)} has duplicate value ${String(z)}`);
        Q.set(z, Y);
      }
    }
    return new _PW({ typeName: Z.ZodDiscriminatedUnion, discriminator: $, options: X, optionsMap: Q, ...o(J) });
  }
};
function ZW($, X) {
  let J = N4($), Q = N4(X);
  if ($ === X) return { valid: true, data: $ };
  else if (J === E.object && Q === E.object) {
    let Y = X$.objectKeys(X), W = X$.objectKeys($).filter((G) => Y.indexOf(G) !== -1), z = { ...$, ...X };
    for (let G of W) {
      let U = ZW($[G], X[G]);
      if (!U.valid) return { valid: false };
      z[G] = U.data;
    }
    return { valid: true, data: z };
  } else if (J === E.array && Q === E.array) {
    if ($.length !== X.length) return { valid: false };
    let Y = [];
    for (let W = 0; W < $.length; W++) {
      let z = $[W], G = X[W], U = ZW(z, G);
      if (!U.valid) return { valid: false };
      Y.push(U.data);
    }
    return { valid: true, data: Y };
  } else if (J === E.date && Q === E.date && +$ === +X) return { valid: true, data: $ };
  else return { valid: false };
}
var qX = class extends e {
  _parse($) {
    let { status: X, ctx: J } = this._processInputParams($), Q = (Y, W) => {
      if (AW(Y) || AW(W)) return l;
      let z = ZW(Y.value, W.value);
      if (!z.valid) return C(J, { code: b.invalid_intersection_types }), l;
      if (IW(Y) || IW(W)) X.dirty();
      return { status: X.value, value: z.data };
    };
    if (J.common.async) return Promise.all([this._def.left._parseAsync({ data: J.data, path: J.path, parent: J }), this._def.right._parseAsync({ data: J.data, path: J.path, parent: J })]).then(([Y, W]) => Q(Y, W));
    else return Q(this._def.left._parseSync({ data: J.data, path: J.path, parent: J }), this._def.right._parseSync({ data: J.data, path: J.path, parent: J }));
  }
};
qX.create = ($, X, J) => {
  return new qX({ left: $, right: X, typeName: Z.ZodIntersection, ...o(J) });
};
var q4 = class _q4 extends e {
  _parse($) {
    let { status: X, ctx: J } = this._processInputParams($);
    if (J.parsedType !== E.array) return C(J, { code: b.invalid_type, expected: E.array, received: J.parsedType }), l;
    if (J.data.length < this._def.items.length) return C(J, { code: b.too_small, minimum: this._def.items.length, inclusive: true, exact: false, type: "array" }), l;
    if (!this._def.rest && J.data.length > this._def.items.length) C(J, { code: b.too_big, maximum: this._def.items.length, inclusive: true, exact: false, type: "array" }), X.dirty();
    let Y = [...J.data].map((W, z) => {
      let G = this._def.items[z] || this._def.rest;
      if (!G) return null;
      return G._parse(new y6(J, W, J.path, z));
    }).filter((W) => !!W);
    if (J.common.async) return Promise.all(Y).then((W) => {
      return c$.mergeArray(X, W);
    });
    else return c$.mergeArray(X, Y);
  }
  get items() {
    return this._def.items;
  }
  rest($) {
    return new _q4({ ...this._def, rest: $ });
  }
};
q4.create = ($, X) => {
  if (!Array.isArray($)) throw Error("You must pass an array of schemas to z.tuple([ ... ])");
  return new q4({ items: $, typeName: Z.ZodTuple, rest: null, ...o(X) });
};
var JY = class _JY extends e {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse($) {
    let { status: X, ctx: J } = this._processInputParams($);
    if (J.parsedType !== E.object) return C(J, { code: b.invalid_type, expected: E.object, received: J.parsedType }), l;
    let Q = [], Y = this._def.keyType, W = this._def.valueType;
    for (let z in J.data) Q.push({ key: Y._parse(new y6(J, z, J.path, z)), value: W._parse(new y6(J, J.data[z], J.path, z)), alwaysSet: z in J.data });
    if (J.common.async) return c$.mergeObjectAsync(X, Q);
    else return c$.mergeObjectSync(X, Q);
  }
  get element() {
    return this._def.valueType;
  }
  static create($, X, J) {
    if (X instanceof e) return new _JY({ keyType: $, valueType: X, typeName: Z.ZodRecord, ...o(J) });
    return new _JY({ keyType: w4.create(), valueType: $, typeName: Z.ZodRecord, ...o(X) });
  }
};
var YY = class extends e {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse($) {
    let { status: X, ctx: J } = this._processInputParams($);
    if (J.parsedType !== E.map) return C(J, { code: b.invalid_type, expected: E.map, received: J.parsedType }), l;
    let Q = this._def.keyType, Y = this._def.valueType, W = [...J.data.entries()].map(([z, G], U) => {
      return { key: Q._parse(new y6(J, z, J.path, [U, "key"])), value: Y._parse(new y6(J, G, J.path, [U, "value"])) };
    });
    if (J.common.async) {
      let z = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (let G of W) {
          let U = await G.key, H = await G.value;
          if (U.status === "aborted" || H.status === "aborted") return l;
          if (U.status === "dirty" || H.status === "dirty") X.dirty();
          z.set(U.value, H.value);
        }
        return { status: X.value, value: z };
      });
    } else {
      let z = /* @__PURE__ */ new Map();
      for (let G of W) {
        let { key: U, value: H } = G;
        if (U.status === "aborted" || H.status === "aborted") return l;
        if (U.status === "dirty" || H.status === "dirty") X.dirty();
        z.set(U.value, H.value);
      }
      return { status: X.value, value: z };
    }
  }
};
YY.create = ($, X, J) => {
  return new YY({ valueType: X, keyType: $, typeName: Z.ZodMap, ...o(J) });
};
var M0 = class _M0 extends e {
  _parse($) {
    let { status: X, ctx: J } = this._processInputParams($);
    if (J.parsedType !== E.set) return C(J, { code: b.invalid_type, expected: E.set, received: J.parsedType }), l;
    let Q = this._def;
    if (Q.minSize !== null) {
      if (J.data.size < Q.minSize.value) C(J, { code: b.too_small, minimum: Q.minSize.value, type: "set", inclusive: true, exact: false, message: Q.minSize.message }), X.dirty();
    }
    if (Q.maxSize !== null) {
      if (J.data.size > Q.maxSize.value) C(J, { code: b.too_big, maximum: Q.maxSize.value, type: "set", inclusive: true, exact: false, message: Q.maxSize.message }), X.dirty();
    }
    let Y = this._def.valueType;
    function W(G) {
      let U = /* @__PURE__ */ new Set();
      for (let H of G) {
        if (H.status === "aborted") return l;
        if (H.status === "dirty") X.dirty();
        U.add(H.value);
      }
      return { status: X.value, value: U };
    }
    let z = [...J.data.values()].map((G, U) => Y._parse(new y6(J, G, J.path, U)));
    if (J.common.async) return Promise.all(z).then((G) => W(G));
    else return W(z);
  }
  min($, X) {
    return new _M0({ ...this._def, minSize: { value: $, message: f.toString(X) } });
  }
  max($, X) {
    return new _M0({ ...this._def, maxSize: { value: $, message: f.toString(X) } });
  }
  size($, X) {
    return this.min($, X).max($, X);
  }
  nonempty($) {
    return this.min(1, $);
  }
};
M0.create = ($, X) => {
  return new M0({ valueType: $, minSize: null, maxSize: null, typeName: Z.ZodSet, ...o(X) });
};
var VX = class _VX extends e {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse($) {
    let { ctx: X } = this._processInputParams($);
    if (X.parsedType !== E.function) return C(X, { code: b.invalid_type, expected: E.function, received: X.parsedType }), l;
    function J(z, G) {
      return aJ({ data: z, path: X.path, errorMaps: [X.common.contextualErrorMap, X.schemaErrorMap, HX(), h4].filter((U) => !!U), issueData: { code: b.invalid_arguments, argumentsError: G } });
    }
    function Q(z, G) {
      return aJ({ data: z, path: X.path, errorMaps: [X.common.contextualErrorMap, X.schemaErrorMap, HX(), h4].filter((U) => !!U), issueData: { code: b.invalid_return_type, returnTypeError: G } });
    }
    let Y = { errorMap: X.common.contextualErrorMap }, W = X.data;
    if (this._def.returns instanceof A0) {
      let z = this;
      return t$(async function(...G) {
        let U = new L6([]), H = await z._def.args.parseAsync(G, Y).catch((N) => {
          throw U.addIssue(J(G, N)), U;
        }), K = await Reflect.apply(W, this, H);
        return await z._def.returns._def.type.parseAsync(K, Y).catch((N) => {
          throw U.addIssue(Q(K, N)), U;
        });
      });
    } else {
      let z = this;
      return t$(function(...G) {
        let U = z._def.args.safeParse(G, Y);
        if (!U.success) throw new L6([J(G, U.error)]);
        let H = Reflect.apply(W, this, U.data), K = z._def.returns.safeParse(H, Y);
        if (!K.success) throw new L6([Q(H, K.error)]);
        return K.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...$) {
    return new _VX({ ...this._def, args: q4.create($).rest(b1.create()) });
  }
  returns($) {
    return new _VX({ ...this._def, returns: $ });
  }
  implement($) {
    return this.parse($);
  }
  strictImplement($) {
    return this.parse($);
  }
  static create($, X, J) {
    return new _VX({ args: $ ? $ : q4.create([]).rest(b1.create()), returns: X || b1.create(), typeName: Z.ZodFunction, ...o(J) });
  }
};
var LX = class extends e {
  get schema() {
    return this._def.getter();
  }
  _parse($) {
    let { ctx: X } = this._processInputParams($);
    return this._def.getter()._parse({ data: X.data, path: X.path, parent: X });
  }
};
LX.create = ($, X) => {
  return new LX({ getter: $, typeName: Z.ZodLazy, ...o(X) });
};
var DX = class extends e {
  _parse($) {
    if ($.data !== this._def.value) {
      let X = this._getOrReturnCtx($);
      return C(X, { received: X.data, code: b.invalid_literal, expected: this._def.value }), l;
    }
    return { status: "valid", value: $.data };
  }
  get value() {
    return this._def.value;
  }
};
DX.create = ($, X) => {
  return new DX({ value: $, typeName: Z.ZodLiteral, ...o(X) });
};
function pV($, X) {
  return new Z1({ values: $, typeName: Z.ZodEnum, ...o(X) });
}
var Z1 = class _Z1 extends e {
  _parse($) {
    if (typeof $.data !== "string") {
      let X = this._getOrReturnCtx($), J = this._def.values;
      return C(X, { expected: X$.joinValues(J), received: X.parsedType, code: b.invalid_type }), l;
    }
    if (!this._cache) this._cache = new Set(this._def.values);
    if (!this._cache.has($.data)) {
      let X = this._getOrReturnCtx($), J = this._def.values;
      return C(X, { received: X.data, code: b.invalid_enum_value, options: J }), l;
    }
    return t$($.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    let $ = {};
    for (let X of this._def.values) $[X] = X;
    return $;
  }
  get Values() {
    let $ = {};
    for (let X of this._def.values) $[X] = X;
    return $;
  }
  get Enum() {
    let $ = {};
    for (let X of this._def.values) $[X] = X;
    return $;
  }
  extract($, X = this._def) {
    return _Z1.create($, { ...this._def, ...X });
  }
  exclude($, X = this._def) {
    return _Z1.create(this.options.filter((J) => !$.includes(J)), { ...this._def, ...X });
  }
};
Z1.create = pV;
var jX = class extends e {
  _parse($) {
    let X = X$.getValidEnumValues(this._def.values), J = this._getOrReturnCtx($);
    if (J.parsedType !== E.string && J.parsedType !== E.number) {
      let Q = X$.objectValues(X);
      return C(J, { expected: X$.joinValues(Q), received: J.parsedType, code: b.invalid_type }), l;
    }
    if (!this._cache) this._cache = new Set(X$.getValidEnumValues(this._def.values));
    if (!this._cache.has($.data)) {
      let Q = X$.objectValues(X);
      return C(J, { received: J.data, code: b.invalid_enum_value, options: Q }), l;
    }
    return t$($.data);
  }
  get enum() {
    return this._def.values;
  }
};
jX.create = ($, X) => {
  return new jX({ values: $, typeName: Z.ZodNativeEnum, ...o(X) });
};
var A0 = class extends e {
  unwrap() {
    return this._def.type;
  }
  _parse($) {
    let { ctx: X } = this._processInputParams($);
    if (X.parsedType !== E.promise && X.common.async === false) return C(X, { code: b.invalid_type, expected: E.promise, received: X.parsedType }), l;
    let J = X.parsedType === E.promise ? X.data : Promise.resolve(X.data);
    return t$(J.then((Q) => {
      return this._def.type.parseAsync(Q, { path: X.path, errorMap: X.common.contextualErrorMap });
    }));
  }
};
A0.create = ($, X) => {
  return new A0({ type: $, typeName: Z.ZodPromise, ...o(X) });
};
var t6 = class extends e {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === Z.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse($) {
    let { status: X, ctx: J } = this._processInputParams($), Q = this._def.effect || null, Y = { addIssue: (W) => {
      if (C(J, W), W.fatal) X.abort();
      else X.dirty();
    }, get path() {
      return J.path;
    } };
    if (Y.addIssue = Y.addIssue.bind(Y), Q.type === "preprocess") {
      let W = Q.transform(J.data, Y);
      if (J.common.async) return Promise.resolve(W).then(async (z) => {
        if (X.value === "aborted") return l;
        let G = await this._def.schema._parseAsync({ data: z, path: J.path, parent: J });
        if (G.status === "aborted") return l;
        if (G.status === "dirty") return L0(G.value);
        if (X.value === "dirty") return L0(G.value);
        return G;
      });
      else {
        if (X.value === "aborted") return l;
        let z = this._def.schema._parseSync({ data: W, path: J.path, parent: J });
        if (z.status === "aborted") return l;
        if (z.status === "dirty") return L0(z.value);
        if (X.value === "dirty") return L0(z.value);
        return z;
      }
    }
    if (Q.type === "refinement") {
      let W = (z) => {
        let G = Q.refinement(z, Y);
        if (J.common.async) return Promise.resolve(G);
        if (G instanceof Promise) throw Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        return z;
      };
      if (J.common.async === false) {
        let z = this._def.schema._parseSync({ data: J.data, path: J.path, parent: J });
        if (z.status === "aborted") return l;
        if (z.status === "dirty") X.dirty();
        return W(z.value), { status: X.value, value: z.value };
      } else return this._def.schema._parseAsync({ data: J.data, path: J.path, parent: J }).then((z) => {
        if (z.status === "aborted") return l;
        if (z.status === "dirty") X.dirty();
        return W(z.value).then(() => {
          return { status: X.value, value: z.value };
        });
      });
    }
    if (Q.type === "transform") if (J.common.async === false) {
      let W = this._def.schema._parseSync({ data: J.data, path: J.path, parent: J });
      if (!I1(W)) return l;
      let z = Q.transform(W.value, Y);
      if (z instanceof Promise) throw Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");
      return { status: X.value, value: z };
    } else return this._def.schema._parseAsync({ data: J.data, path: J.path, parent: J }).then((W) => {
      if (!I1(W)) return l;
      return Promise.resolve(Q.transform(W.value, Y)).then((z) => ({ status: X.value, value: z }));
    });
    X$.assertNever(Q);
  }
};
t6.create = ($, X, J) => {
  return new t6({ schema: $, typeName: Z.ZodEffects, effect: X, ...o(J) });
};
t6.createWithPreprocess = ($, X, J) => {
  return new t6({ schema: X, effect: { type: "preprocess", transform: $ }, typeName: Z.ZodEffects, ...o(J) });
};
var I6 = class extends e {
  _parse($) {
    if (this._getType($) === E.undefined) return t$(void 0);
    return this._def.innerType._parse($);
  }
  unwrap() {
    return this._def.innerType;
  }
};
I6.create = ($, X) => {
  return new I6({ innerType: $, typeName: Z.ZodOptional, ...o(X) });
};
var u4 = class extends e {
  _parse($) {
    if (this._getType($) === E.null) return t$(null);
    return this._def.innerType._parse($);
  }
  unwrap() {
    return this._def.innerType;
  }
};
u4.create = ($, X) => {
  return new u4({ innerType: $, typeName: Z.ZodNullable, ...o(X) });
};
var FX = class extends e {
  _parse($) {
    let { ctx: X } = this._processInputParams($), J = X.data;
    if (X.parsedType === E.undefined) J = this._def.defaultValue();
    return this._def.innerType._parse({ data: J, path: X.path, parent: X });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
FX.create = ($, X) => {
  return new FX({ innerType: $, typeName: Z.ZodDefault, defaultValue: typeof X.default === "function" ? X.default : () => X.default, ...o(X) });
};
var MX = class extends e {
  _parse($) {
    let { ctx: X } = this._processInputParams($), J = { ...X, common: { ...X.common, issues: [] } }, Q = this._def.innerType._parse({ data: J.data, path: J.path, parent: { ...J } });
    if (KX(Q)) return Q.then((Y) => {
      return { status: "valid", value: Y.status === "valid" ? Y.value : this._def.catchValue({ get error() {
        return new L6(J.common.issues);
      }, input: J.data }) };
    });
    else return { status: "valid", value: Q.status === "valid" ? Q.value : this._def.catchValue({ get error() {
      return new L6(J.common.issues);
    }, input: J.data }) };
  }
  removeCatch() {
    return this._def.innerType;
  }
};
MX.create = ($, X) => {
  return new MX({ innerType: $, typeName: Z.ZodCatch, catchValue: typeof X.catch === "function" ? X.catch : () => X.catch, ...o(X) });
};
var QY = class extends e {
  _parse($) {
    if (this._getType($) !== E.nan) {
      let J = this._getOrReturnCtx($);
      return C(J, { code: b.invalid_type, expected: E.nan, received: J.parsedType }), l;
    }
    return { status: "valid", value: $.data };
  }
};
QY.create = ($) => {
  return new QY({ typeName: Z.ZodNaN, ...o($) });
};
var Yd = Symbol("zod_brand");
var RW = class extends e {
  _parse($) {
    let { ctx: X } = this._processInputParams($), J = X.data;
    return this._def.type._parse({ data: J, path: X.path, parent: X });
  }
  unwrap() {
    return this._def.type;
  }
};
var WY = class _WY extends e {
  _parse($) {
    let { status: X, ctx: J } = this._processInputParams($);
    if (J.common.async) return (async () => {
      let Y = await this._def.in._parseAsync({ data: J.data, path: J.path, parent: J });
      if (Y.status === "aborted") return l;
      if (Y.status === "dirty") return X.dirty(), L0(Y.value);
      else return this._def.out._parseAsync({ data: Y.value, path: J.path, parent: J });
    })();
    else {
      let Q = this._def.in._parseSync({ data: J.data, path: J.path, parent: J });
      if (Q.status === "aborted") return l;
      if (Q.status === "dirty") return X.dirty(), { status: "dirty", value: Q.value };
      else return this._def.out._parseSync({ data: Q.value, path: J.path, parent: J });
    }
  }
  static create($, X) {
    return new _WY({ in: $, out: X, typeName: Z.ZodPipeline });
  }
};
var AX = class extends e {
  _parse($) {
    let X = this._def.innerType._parse($), J = (Q) => {
      if (I1(Q)) Q.value = Object.freeze(Q.value);
      return Q;
    };
    return KX(X) ? X.then((Q) => J(Q)) : J(X);
  }
  unwrap() {
    return this._def.innerType;
  }
};
AX.create = ($, X) => {
  return new AX({ innerType: $, typeName: Z.ZodReadonly, ...o(X) });
};
var Qd = { object: R$.lazycreate };
var Z;
(function($) {
  $.ZodString = "ZodString", $.ZodNumber = "ZodNumber", $.ZodNaN = "ZodNaN", $.ZodBigInt = "ZodBigInt", $.ZodBoolean = "ZodBoolean", $.ZodDate = "ZodDate", $.ZodSymbol = "ZodSymbol", $.ZodUndefined = "ZodUndefined", $.ZodNull = "ZodNull", $.ZodAny = "ZodAny", $.ZodUnknown = "ZodUnknown", $.ZodNever = "ZodNever", $.ZodVoid = "ZodVoid", $.ZodArray = "ZodArray", $.ZodObject = "ZodObject", $.ZodUnion = "ZodUnion", $.ZodDiscriminatedUnion = "ZodDiscriminatedUnion", $.ZodIntersection = "ZodIntersection", $.ZodTuple = "ZodTuple", $.ZodRecord = "ZodRecord", $.ZodMap = "ZodMap", $.ZodSet = "ZodSet", $.ZodFunction = "ZodFunction", $.ZodLazy = "ZodLazy", $.ZodLiteral = "ZodLiteral", $.ZodEnum = "ZodEnum", $.ZodEffects = "ZodEffects", $.ZodNativeEnum = "ZodNativeEnum", $.ZodOptional = "ZodOptional", $.ZodNullable = "ZodNullable", $.ZodDefault = "ZodDefault", $.ZodCatch = "ZodCatch", $.ZodPromise = "ZodPromise", $.ZodBranded = "ZodBranded", $.ZodPipeline = "ZodPipeline", $.ZodReadonly = "ZodReadonly";
})(Z || (Z = {}));
var Wd = w4.create;
var zd = j0.create;
var Gd = QY.create;
var Ud = F0.create;
var Hd = sJ.create;
var Kd = NX.create;
var Vd = eJ.create;
var Nd = OX.create;
var Od = wX.create;
var wd = $Y.create;
var Bd = b1.create;
var qd = B4.create;
var Ld = XY.create;
var Dd = o6.create;
var dV = R$.create;
var jd = R$.strictCreate;
var Fd = BX.create;
var Md = PW.create;
var Ad = qX.create;
var Id = q4.create;
var bd = JY.create;
var Zd = YY.create;
var Pd = M0.create;
var Rd = VX.create;
var Ed = LX.create;
var Sd = DX.create;
var vd = Z1.create;
var Cd = jX.create;
var kd = A0.create;
var _d = t6.create;
var xd = I6.create;
var Td = u4.create;
var yd = t6.createWithPreprocess;
var fd = WY.create;
var f6 = {};
H1(f6, { version: () => Cz, util: () => R, treeifyError: () => HY, toJSONSchema: () => g0, toDotPath: () => rV, safeParseAsync: () => c4, safeParse: () => l4, registry: () => gX, regexes: () => p4, prettifyError: () => KY, parseAsync: () => S1, parse: () => E1, locales: () => _0, isValidJWT: () => NN, isValidBase64URL: () => VN, isValidBase64: () => fz, globalRegistry: () => G6, globalConfig: () => IX, function: () => p7, formatError: () => R0, flattenError: () => P0, config: () => E$, clone: () => p$, _xid: () => tX, _void: () => y7, _uuidv7: () => cX, _uuidv6: () => lX, _uuidv4: () => mX, _uuid: () => uX, _url: () => pX, _uppercase: () => H9, _unknown: () => k1, _union: () => jb, _undefined: () => k7, _ulid: () => oX, _uint64: () => v7, _uint32: () => P7, _tuple: () => y3, _trim: () => B9, _transform: () => Eb, _toUpperCase: () => L9, _toLowerCase: () => q9, _templateLiteral: () => fb, _symbol: () => C7, _success: () => _b, _stringbool: () => l7, _stringFormat: () => c7, _string: () => j7, _startsWith: () => V9, _size: () => z9, _set: () => bb, _safeParseAsync: () => wY, _safeParse: () => OY, _regex: () => G9, _refine: () => m7, _record: () => Ab, _readonly: () => yb, _property: () => T3, _promise: () => hb, _positive: () => C3, _pipe: () => Tb, _parseAsync: () => NY, _parse: () => VY, _overwrite: () => M4, _optional: () => Sb, _number: () => M7, _nullable: () => vb, _null: () => _7, _normalize: () => w9, _nonpositive: () => _3, _nonoptional: () => kb, _nonnegative: () => x3, _never: () => T7, _negative: () => k3, _nativeEnum: () => Pb, _nanoid: () => iX, _nan: () => g7, _multipleOf: () => _1, _minSize: () => x1, _minLength: () => n4, _min: () => U6, _mime: () => O9, _maxSize: () => T0, _maxLength: () => y0, _max: () => b6, _map: () => Ib, _lte: () => b6, _lt: () => j4, _lowercase: () => U9, _literal: () => Rb, _length: () => f0, _lazy: () => gb, _ksuid: () => aX, _jwt: () => W9, _isoTime: () => Z3, _isoDuration: () => P3, _isoDateTime: () => I3, _isoDate: () => b3, _ipv6: () => eX, _ipv4: () => sX, _intersection: () => Mb, _int64: () => S7, _int32: () => Z7, _int: () => A7, _includes: () => K9, _guid: () => x0, _gte: () => U6, _gt: () => F4, _float64: () => b7, _float32: () => I7, _file: () => h7, _enum: () => Zb, _endsWith: () => N9, _emoji: () => dX, _email: () => hX, _e164: () => Q9, _discriminatedUnion: () => Fb, _default: () => Cb, _date: () => f7, _custom: () => u7, _cuid2: () => rX, _cuid: () => nX, _coercedString: () => A3, _coercedNumber: () => R3, _coercedDate: () => v3, _coercedBoolean: () => E3, _coercedBigint: () => S3, _cidrv6: () => X9, _cidrv4: () => $9, _catch: () => xb, _boolean: () => R7, _bigint: () => E7, _base64url: () => Y9, _base64: () => J9, _array: () => D9, _any: () => x7, TimePrecision: () => F7, NEVER: () => zY, JSONSchemaGenerator: () => d7, JSONSchema: () => qN, Doc: () => DY, $output: () => L7, $input: () => D7, $constructor: () => q, $brand: () => GY, $ZodXID: () => vY, $ZodVoid: () => rY, $ZodUnknown: () => C1, $ZodUnion: () => TX, $ZodUndefined: () => pY, $ZodUUID: () => AY, $ZodURL: () => bY, $ZodULID: () => SY, $ZodType: () => d, $ZodTuple: () => i4, $ZodTransform: () => C0, $ZodTemplateLiteral: () => O7, $ZodSymbol: () => cY, $ZodSuccess: () => H7, $ZodStringFormat: () => H$, $ZodString: () => d4, $ZodSet: () => $7, $ZodRegistry: () => fX, $ZodRecord: () => sY, $ZodRealError: () => Z0, $ZodReadonly: () => N7, $ZodPromise: () => w7, $ZodPrefault: () => G7, $ZodPipe: () => k0, $ZodOptional: () => Q7, $ZodObject: () => xX, $ZodNumberFormat: () => mY, $ZodNumber: () => kX, $ZodNullable: () => W7, $ZodNull: () => dY, $ZodNonOptional: () => U7, $ZodNever: () => nY, $ZodNanoID: () => PY, $ZodNaN: () => V7, $ZodMap: () => eY, $ZodLiteral: () => J7, $ZodLazy: () => B7, $ZodKSUID: () => CY, $ZodJWT: () => hY, $ZodIntersection: () => aY, $ZodISOTime: () => Tz, $ZodISODuration: () => yz, $ZodISODateTime: () => _z, $ZodISODate: () => xz, $ZodIPv6: () => _Y, $ZodIPv4: () => kY, $ZodGUID: () => MY, $ZodFunction: () => f3, $ZodFile: () => Y7, $ZodError: () => CX, $ZodEnum: () => X7, $ZodEmoji: () => ZY, $ZodEmail: () => IY, $ZodE164: () => gY, $ZodDiscriminatedUnion: () => tY, $ZodDefault: () => z7, $ZodDate: () => oY, $ZodCustomStringFormat: () => uY, $ZodCustom: () => q7, $ZodCheckUpperCase: () => bz, $ZodCheckStringFormat: () => E0, $ZodCheckStartsWith: () => Pz, $ZodCheckSizeEquals: () => Dz, $ZodCheckRegex: () => Az, $ZodCheckProperty: () => Ez, $ZodCheckOverwrite: () => vz, $ZodCheckNumberFormat: () => wz, $ZodCheckMultipleOf: () => Oz, $ZodCheckMinSize: () => Lz, $ZodCheckMinLength: () => Fz, $ZodCheckMimeType: () => Sz, $ZodCheckMaxSize: () => qz, $ZodCheckMaxLength: () => jz, $ZodCheckLowerCase: () => Iz, $ZodCheckLessThan: () => qY, $ZodCheckLengthEquals: () => Mz, $ZodCheckIncludes: () => Zz, $ZodCheckGreaterThan: () => LY, $ZodCheckEndsWith: () => Rz, $ZodCheckBigIntFormat: () => Bz, $ZodCheck: () => A$, $ZodCatch: () => K7, $ZodCUID2: () => EY, $ZodCUID: () => RY, $ZodCIDRv6: () => TY, $ZodCIDRv4: () => xY, $ZodBoolean: () => S0, $ZodBigIntFormat: () => lY, $ZodBigInt: () => _X, $ZodBase64URL: () => fY, $ZodBase64: () => yY, $ZodAsyncError: () => L4, $ZodArray: () => v0, $ZodAny: () => iY });
var zY = Object.freeze({ status: "aborted" });
function q($, X, J) {
  function Q(G, U) {
    var H;
    Object.defineProperty(G, "_zod", { value: G._zod ?? {}, enumerable: false }), (H = G._zod).traits ?? (H.traits = /* @__PURE__ */ new Set()), G._zod.traits.add($), X(G, U);
    for (let K in z.prototype) if (!(K in G)) Object.defineProperty(G, K, { value: z.prototype[K].bind(G) });
    G._zod.constr = z, G._zod.def = U;
  }
  let Y = J?.Parent ?? Object;
  class W extends Y {
  }
  Object.defineProperty(W, "name", { value: $ });
  function z(G) {
    var U;
    let H = J?.Parent ? new W() : this;
    Q(H, G), (U = H._zod).deferred ?? (U.deferred = []);
    for (let K of H._zod.deferred) K();
    return H;
  }
  return Object.defineProperty(z, "init", { value: Q }), Object.defineProperty(z, Symbol.hasInstance, { value: (G) => {
    if (J?.Parent && G instanceof J.Parent) return true;
    return G?._zod?.traits?.has($);
  } }), Object.defineProperty(z, "name", { value: $ }), z;
}
var GY = Symbol("zod_brand");
var L4 = class extends Error {
  constructor() {
    super("Encountered Promise during synchronous parse. Use .parseAsync() instead.");
  }
};
var IX = {};
function E$($) {
  if ($) Object.assign(IX, $);
  return IX;
}
var R = {};
H1(R, { unwrapMessage: () => bX, stringifyPrimitive: () => S, required: () => DI, randomString: () => HI, propertyKeyTypes: () => EX, promiseAllObject: () => UI, primitiveTypes: () => _W, prefixIssues: () => z6, pick: () => OI, partial: () => LI, optionalKeys: () => xW, omit: () => wI, numKeys: () => KI, nullish: () => m4, normalizeParams: () => P, merge: () => qI, jsonStringifyReplacer: () => SW, joinValues: () => M, issue: () => fW, isPlainObject: () => b0, isObject: () => I0, getSizableOrigin: () => SX, getParsedType: () => VI, getLengthableOrigin: () => vX, getEnumValues: () => ZX, getElementAtPath: () => GI, floatSafeRemainder: () => vW, finalizeIssue: () => D6, extend: () => BI, escapeRegex: () => D4, esc: () => P1, defineLazy: () => G$, createTransparentProxy: () => NI, clone: () => p$, cleanRegex: () => RX, cleanEnum: () => jI, captureStackTrace: () => UY, cached: () => PX, assignProp: () => CW, assertNotEqual: () => YI, assertNever: () => WI, assertIs: () => QI, assertEqual: () => JI, assert: () => zI, allowsEval: () => kW, aborted: () => R1, NUMBER_FORMAT_RANGES: () => TW, Class: () => iV, BIGINT_FORMAT_RANGES: () => yW });
function JI($) {
  return $;
}
function YI($) {
  return $;
}
function QI($) {
}
function WI($) {
  throw Error();
}
function zI($) {
}
function ZX($) {
  let X = Object.values($).filter((Q) => typeof Q === "number");
  return Object.entries($).filter(([Q, Y]) => X.indexOf(+Q) === -1).map(([Q, Y]) => Y);
}
function M($, X = "|") {
  return $.map((J) => S(J)).join(X);
}
function SW($, X) {
  if (typeof X === "bigint") return X.toString();
  return X;
}
function PX($) {
  return { get value() {
    {
      let J = $();
      return Object.defineProperty(this, "value", { value: J }), J;
    }
    throw Error("cached value already set");
  } };
}
function m4($) {
  return $ === null || $ === void 0;
}
function RX($) {
  let X = $.startsWith("^") ? 1 : 0, J = $.endsWith("$") ? $.length - 1 : $.length;
  return $.slice(X, J);
}
function vW($, X) {
  let J = ($.toString().split(".")[1] || "").length, Q = (X.toString().split(".")[1] || "").length, Y = J > Q ? J : Q, W = Number.parseInt($.toFixed(Y).replace(".", "")), z = Number.parseInt(X.toFixed(Y).replace(".", ""));
  return W % z / 10 ** Y;
}
function G$($, X, J) {
  Object.defineProperty($, X, { get() {
    {
      let Y = J();
      return $[X] = Y, Y;
    }
    throw Error("cached value already set");
  }, set(Y) {
    Object.defineProperty($, X, { value: Y });
  }, configurable: true });
}
function CW($, X, J) {
  Object.defineProperty($, X, { value: J, writable: true, enumerable: true, configurable: true });
}
function GI($, X) {
  if (!X) return $;
  return X.reduce((J, Q) => J?.[Q], $);
}
function UI($) {
  let X = Object.keys($), J = X.map((Q) => $[Q]);
  return Promise.all(J).then((Q) => {
    let Y = {};
    for (let W = 0; W < X.length; W++) Y[X[W]] = Q[W];
    return Y;
  });
}
function HI($ = 10) {
  let J = "";
  for (let Q = 0; Q < $; Q++) J += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
  return J;
}
function P1($) {
  return JSON.stringify($);
}
var UY = Error.captureStackTrace ? Error.captureStackTrace : (...$) => {
};
function I0($) {
  return typeof $ === "object" && $ !== null && !Array.isArray($);
}
var kW = PX(() => {
  if (typeof navigator < "u" && navigator?.userAgent?.includes("Cloudflare")) return false;
  try {
    return new Function(""), true;
  } catch ($) {
    return false;
  }
});
function b0($) {
  if (I0($) === false) return false;
  let X = $.constructor;
  if (X === void 0) return true;
  let J = X.prototype;
  if (I0(J) === false) return false;
  if (Object.prototype.hasOwnProperty.call(J, "isPrototypeOf") === false) return false;
  return true;
}
function KI($) {
  let X = 0;
  for (let J in $) if (Object.prototype.hasOwnProperty.call($, J)) X++;
  return X;
}
var VI = ($) => {
  let X = typeof $;
  switch (X) {
    case "undefined":
      return "undefined";
    case "string":
      return "string";
    case "number":
      return Number.isNaN($) ? "nan" : "number";
    case "boolean":
      return "boolean";
    case "function":
      return "function";
    case "bigint":
      return "bigint";
    case "symbol":
      return "symbol";
    case "object":
      if (Array.isArray($)) return "array";
      if ($ === null) return "null";
      if ($.then && typeof $.then === "function" && $.catch && typeof $.catch === "function") return "promise";
      if (typeof Map < "u" && $ instanceof Map) return "map";
      if (typeof Set < "u" && $ instanceof Set) return "set";
      if (typeof Date < "u" && $ instanceof Date) return "date";
      if (typeof File < "u" && $ instanceof File) return "file";
      return "object";
    default:
      throw Error(`Unknown data type: ${X}`);
  }
};
var EX = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
var _W = /* @__PURE__ */ new Set(["string", "number", "bigint", "boolean", "symbol", "undefined"]);
function D4($) {
  return $.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function p$($, X, J) {
  let Q = new $._zod.constr(X ?? $._zod.def);
  if (!X || J?.parent) Q._zod.parent = $;
  return Q;
}
function P($) {
  let X = $;
  if (!X) return {};
  if (typeof X === "string") return { error: () => X };
  if (X?.message !== void 0) {
    if (X?.error !== void 0) throw Error("Cannot specify both `message` and `error` params");
    X.error = X.message;
  }
  if (delete X.message, typeof X.error === "string") return { ...X, error: () => X.error };
  return X;
}
function NI($) {
  let X;
  return new Proxy({}, { get(J, Q, Y) {
    return X ?? (X = $()), Reflect.get(X, Q, Y);
  }, set(J, Q, Y, W) {
    return X ?? (X = $()), Reflect.set(X, Q, Y, W);
  }, has(J, Q) {
    return X ?? (X = $()), Reflect.has(X, Q);
  }, deleteProperty(J, Q) {
    return X ?? (X = $()), Reflect.deleteProperty(X, Q);
  }, ownKeys(J) {
    return X ?? (X = $()), Reflect.ownKeys(X);
  }, getOwnPropertyDescriptor(J, Q) {
    return X ?? (X = $()), Reflect.getOwnPropertyDescriptor(X, Q);
  }, defineProperty(J, Q, Y) {
    return X ?? (X = $()), Reflect.defineProperty(X, Q, Y);
  } });
}
function S($) {
  if (typeof $ === "bigint") return $.toString() + "n";
  if (typeof $ === "string") return `"${$}"`;
  return `${$}`;
}
function xW($) {
  return Object.keys($).filter((X) => {
    return $[X]._zod.optin === "optional" && $[X]._zod.optout === "optional";
  });
}
var TW = { safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER], int32: [-2147483648, 2147483647], uint32: [0, 4294967295], float32: [-34028234663852886e22, 34028234663852886e22], float64: [-Number.MAX_VALUE, Number.MAX_VALUE] };
var yW = { int64: [BigInt("-9223372036854775808"), BigInt("9223372036854775807")], uint64: [BigInt(0), BigInt("18446744073709551615")] };
function OI($, X) {
  let J = {}, Q = $._zod.def;
  for (let Y in X) {
    if (!(Y in Q.shape)) throw Error(`Unrecognized key: "${Y}"`);
    if (!X[Y]) continue;
    J[Y] = Q.shape[Y];
  }
  return p$($, { ...$._zod.def, shape: J, checks: [] });
}
function wI($, X) {
  let J = { ...$._zod.def.shape }, Q = $._zod.def;
  for (let Y in X) {
    if (!(Y in Q.shape)) throw Error(`Unrecognized key: "${Y}"`);
    if (!X[Y]) continue;
    delete J[Y];
  }
  return p$($, { ...$._zod.def, shape: J, checks: [] });
}
function BI($, X) {
  if (!b0(X)) throw Error("Invalid input to extend: expected a plain object");
  let J = { ...$._zod.def, get shape() {
    let Q = { ...$._zod.def.shape, ...X };
    return CW(this, "shape", Q), Q;
  }, checks: [] };
  return p$($, J);
}
function qI($, X) {
  return p$($, { ...$._zod.def, get shape() {
    let J = { ...$._zod.def.shape, ...X._zod.def.shape };
    return CW(this, "shape", J), J;
  }, catchall: X._zod.def.catchall, checks: [] });
}
function LI($, X, J) {
  let Q = X._zod.def.shape, Y = { ...Q };
  if (J) for (let W in J) {
    if (!(W in Q)) throw Error(`Unrecognized key: "${W}"`);
    if (!J[W]) continue;
    Y[W] = $ ? new $({ type: "optional", innerType: Q[W] }) : Q[W];
  }
  else for (let W in Q) Y[W] = $ ? new $({ type: "optional", innerType: Q[W] }) : Q[W];
  return p$(X, { ...X._zod.def, shape: Y, checks: [] });
}
function DI($, X, J) {
  let Q = X._zod.def.shape, Y = { ...Q };
  if (J) for (let W in J) {
    if (!(W in Y)) throw Error(`Unrecognized key: "${W}"`);
    if (!J[W]) continue;
    Y[W] = new $({ type: "nonoptional", innerType: Q[W] });
  }
  else for (let W in Q) Y[W] = new $({ type: "nonoptional", innerType: Q[W] });
  return p$(X, { ...X._zod.def, shape: Y, checks: [] });
}
function R1($, X = 0) {
  for (let J = X; J < $.issues.length; J++) if ($.issues[J]?.continue !== true) return true;
  return false;
}
function z6($, X) {
  return X.map((J) => {
    var Q;
    return (Q = J).path ?? (Q.path = []), J.path.unshift($), J;
  });
}
function bX($) {
  return typeof $ === "string" ? $ : $?.message;
}
function D6($, X, J) {
  let Q = { ...$, path: $.path ?? [] };
  if (!$.message) {
    let Y = bX($.inst?._zod.def?.error?.($)) ?? bX(X?.error?.($)) ?? bX(J.customError?.($)) ?? bX(J.localeError?.($)) ?? "Invalid input";
    Q.message = Y;
  }
  if (delete Q.inst, delete Q.continue, !X?.reportInput) delete Q.input;
  return Q;
}
function SX($) {
  if ($ instanceof Set) return "set";
  if ($ instanceof Map) return "map";
  if ($ instanceof File) return "file";
  return "unknown";
}
function vX($) {
  if (Array.isArray($)) return "array";
  if (typeof $ === "string") return "string";
  return "unknown";
}
function fW(...$) {
  let [X, J, Q] = $;
  if (typeof X === "string") return { message: X, code: "custom", input: J, inst: Q };
  return { ...X };
}
function jI($) {
  return Object.entries($).filter(([X, J]) => {
    return Number.isNaN(Number.parseInt(X, 10));
  }).map((X) => X[1]);
}
var iV = class {
  constructor(...$) {
  }
};
var nV = ($, X) => {
  $.name = "$ZodError", Object.defineProperty($, "_zod", { value: $._zod, enumerable: false }), Object.defineProperty($, "issues", { value: X, enumerable: false }), Object.defineProperty($, "message", { get() {
    return JSON.stringify(X, SW, 2);
  }, enumerable: true });
};
var CX = q("$ZodError", nV);
var Z0 = q("$ZodError", nV, { Parent: Error });
function P0($, X = (J) => J.message) {
  let J = {}, Q = [];
  for (let Y of $.issues) if (Y.path.length > 0) J[Y.path[0]] = J[Y.path[0]] || [], J[Y.path[0]].push(X(Y));
  else Q.push(X(Y));
  return { formErrors: Q, fieldErrors: J };
}
function R0($, X) {
  let J = X || function(W) {
    return W.message;
  }, Q = { _errors: [] }, Y = (W) => {
    for (let z of W.issues) if (z.code === "invalid_union" && z.errors.length) z.errors.map((G) => Y({ issues: G }));
    else if (z.code === "invalid_key") Y({ issues: z.issues });
    else if (z.code === "invalid_element") Y({ issues: z.issues });
    else if (z.path.length === 0) Q._errors.push(J(z));
    else {
      let G = Q, U = 0;
      while (U < z.path.length) {
        let H = z.path[U];
        if (U !== z.path.length - 1) G[H] = G[H] || { _errors: [] };
        else G[H] = G[H] || { _errors: [] }, G[H]._errors.push(J(z));
        G = G[H], U++;
      }
    }
  };
  return Y($), Q;
}
function HY($, X) {
  let J = X || function(W) {
    return W.message;
  }, Q = { errors: [] }, Y = (W, z = []) => {
    var G, U;
    for (let H of W.issues) if (H.code === "invalid_union" && H.errors.length) H.errors.map((K) => Y({ issues: K }, H.path));
    else if (H.code === "invalid_key") Y({ issues: H.issues }, H.path);
    else if (H.code === "invalid_element") Y({ issues: H.issues }, H.path);
    else {
      let K = [...z, ...H.path];
      if (K.length === 0) {
        Q.errors.push(J(H));
        continue;
      }
      let V = Q, N = 0;
      while (N < K.length) {
        let O = K[N], w = N === K.length - 1;
        if (typeof O === "string") V.properties ?? (V.properties = {}), (G = V.properties)[O] ?? (G[O] = { errors: [] }), V = V.properties[O];
        else V.items ?? (V.items = []), (U = V.items)[O] ?? (U[O] = { errors: [] }), V = V.items[O];
        if (w) V.errors.push(J(H));
        N++;
      }
    }
  };
  return Y($), Q;
}
function rV($) {
  let X = [];
  for (let J of $) if (typeof J === "number") X.push(`[${J}]`);
  else if (typeof J === "symbol") X.push(`[${JSON.stringify(String(J))}]`);
  else if (/[^\w$]/.test(J)) X.push(`[${JSON.stringify(J)}]`);
  else {
    if (X.length) X.push(".");
    X.push(J);
  }
  return X.join("");
}
function KY($) {
  let X = [], J = [...$.issues].sort((Q, Y) => Q.path.length - Y.path.length);
  for (let Q of J) if (X.push(`\u2716 ${Q.message}`), Q.path?.length) X.push(`  \u2192 at ${rV(Q.path)}`);
  return X.join(`
`);
}
var VY = ($) => (X, J, Q, Y) => {
  let W = Q ? Object.assign(Q, { async: false }) : { async: false }, z = X._zod.run({ value: J, issues: [] }, W);
  if (z instanceof Promise) throw new L4();
  if (z.issues.length) {
    let G = new (Y?.Err ?? $)(z.issues.map((U) => D6(U, W, E$())));
    throw UY(G, Y?.callee), G;
  }
  return z.value;
};
var E1 = VY(Z0);
var NY = ($) => async (X, J, Q, Y) => {
  let W = Q ? Object.assign(Q, { async: true }) : { async: true }, z = X._zod.run({ value: J, issues: [] }, W);
  if (z instanceof Promise) z = await z;
  if (z.issues.length) {
    let G = new (Y?.Err ?? $)(z.issues.map((U) => D6(U, W, E$())));
    throw UY(G, Y?.callee), G;
  }
  return z.value;
};
var S1 = NY(Z0);
var OY = ($) => (X, J, Q) => {
  let Y = Q ? { ...Q, async: false } : { async: false }, W = X._zod.run({ value: J, issues: [] }, Y);
  if (W instanceof Promise) throw new L4();
  return W.issues.length ? { success: false, error: new ($ ?? CX)(W.issues.map((z) => D6(z, Y, E$()))) } : { success: true, data: W.value };
};
var l4 = OY(Z0);
var wY = ($) => async (X, J, Q) => {
  let Y = Q ? Object.assign(Q, { async: true }) : { async: true }, W = X._zod.run({ value: J, issues: [] }, Y);
  if (W instanceof Promise) W = await W;
  return W.issues.length ? { success: false, error: new $(W.issues.map((z) => D6(z, Y, E$()))) } : { success: true, data: W.value };
};
var c4 = wY(Z0);
var p4 = {};
H1(p4, { xid: () => mW, uuid7: () => bI, uuid6: () => II, uuid4: () => AI, uuid: () => v1, uppercase: () => Nz, unicodeEmail: () => RI, undefined: () => Kz, ulid: () => uW, time: () => Jz, string: () => Qz, rfc5322Email: () => PI, number: () => Gz, null: () => Hz, nanoid: () => cW, lowercase: () => Vz, ksuid: () => lW, ipv6: () => oW, ipv4: () => rW, integer: () => zz, html5Email: () => ZI, hostname: () => eW, guid: () => dW, extendedDuration: () => MI, emoji: () => nW, email: () => iW, e164: () => $z, duration: () => pW, domain: () => vI, datetime: () => Yz, date: () => Xz, cuid2: () => hW, cuid: () => gW, cidrv6: () => aW, cidrv4: () => tW, browserEmail: () => EI, boolean: () => Uz, bigint: () => Wz, base64url: () => BY, base64: () => sW, _emoji: () => SI });
var gW = /^[cC][^\s-]{8,}$/;
var hW = /^[0-9a-z]+$/;
var uW = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
var mW = /^[0-9a-vA-V]{20}$/;
var lW = /^[A-Za-z0-9]{27}$/;
var cW = /^[a-zA-Z0-9_-]{21}$/;
var pW = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
var MI = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var dW = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
var v1 = ($) => {
  if (!$) return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$/;
  return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${$}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
var AI = v1(4);
var II = v1(6);
var bI = v1(7);
var iW = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
var ZI = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
var PI = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
var RI = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u;
var EI = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
var SI = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$";
function nW() {
  return new RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", "u");
}
var rW = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var oW = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})$/;
var tW = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
var aW = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var sW = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
var BY = /^[A-Za-z0-9_-]*$/;
var eW = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+$/;
var vI = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
var $z = /^\+(?:[0-9]){6,14}[0-9]$/;
var oV = "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))";
var Xz = new RegExp(`^${oV}$`);
function tV($) {
  return typeof $.precision === "number" ? $.precision === -1 ? "(?:[01]\\d|2[0-3]):[0-5]\\d" : $.precision === 0 ? "(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d" : `(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d\\.\\d{${$.precision}}` : "(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?";
}
function Jz($) {
  return new RegExp(`^${tV($)}$`);
}
function Yz($) {
  let X = tV({ precision: $.precision }), J = ["Z"];
  if ($.local) J.push("");
  if ($.offset) J.push("([+-]\\d{2}:\\d{2})");
  let Q = `${X}(?:${J.join("|")})`;
  return new RegExp(`^${oV}T(?:${Q})$`);
}
var Qz = ($) => {
  let X = $ ? `[\\s\\S]{${$?.minimum ?? 0},${$?.maximum ?? ""}}` : "[\\s\\S]*";
  return new RegExp(`^${X}$`);
};
var Wz = /^\d+n?$/;
var zz = /^\d+$/;
var Gz = /^-?\d+(?:\.\d+)?/i;
var Uz = /true|false/i;
var Hz = /null/i;
var Kz = /undefined/i;
var Vz = /^[^A-Z]*$/;
var Nz = /^[^a-z]*$/;
var A$ = q("$ZodCheck", ($, X) => {
  var J;
  $._zod ?? ($._zod = {}), $._zod.def = X, (J = $._zod).onattach ?? (J.onattach = []);
});
var sV = { number: "number", bigint: "bigint", object: "date" };
var qY = q("$ZodCheckLessThan", ($, X) => {
  A$.init($, X);
  let J = sV[typeof X.value];
  $._zod.onattach.push((Q) => {
    let Y = Q._zod.bag, W = (X.inclusive ? Y.maximum : Y.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
    if (X.value < W) if (X.inclusive) Y.maximum = X.value;
    else Y.exclusiveMaximum = X.value;
  }), $._zod.check = (Q) => {
    if (X.inclusive ? Q.value <= X.value : Q.value < X.value) return;
    Q.issues.push({ origin: J, code: "too_big", maximum: X.value, input: Q.value, inclusive: X.inclusive, inst: $, continue: !X.abort });
  };
});
var LY = q("$ZodCheckGreaterThan", ($, X) => {
  A$.init($, X);
  let J = sV[typeof X.value];
  $._zod.onattach.push((Q) => {
    let Y = Q._zod.bag, W = (X.inclusive ? Y.minimum : Y.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
    if (X.value > W) if (X.inclusive) Y.minimum = X.value;
    else Y.exclusiveMinimum = X.value;
  }), $._zod.check = (Q) => {
    if (X.inclusive ? Q.value >= X.value : Q.value > X.value) return;
    Q.issues.push({ origin: J, code: "too_small", minimum: X.value, input: Q.value, inclusive: X.inclusive, inst: $, continue: !X.abort });
  };
});
var Oz = q("$ZodCheckMultipleOf", ($, X) => {
  A$.init($, X), $._zod.onattach.push((J) => {
    var Q;
    (Q = J._zod.bag).multipleOf ?? (Q.multipleOf = X.value);
  }), $._zod.check = (J) => {
    if (typeof J.value !== typeof X.value) throw Error("Cannot mix number and bigint in multiple_of check.");
    if (typeof J.value === "bigint" ? J.value % X.value === BigInt(0) : vW(J.value, X.value) === 0) return;
    J.issues.push({ origin: typeof J.value, code: "not_multiple_of", divisor: X.value, input: J.value, inst: $, continue: !X.abort });
  };
});
var wz = q("$ZodCheckNumberFormat", ($, X) => {
  A$.init($, X), X.format = X.format || "float64";
  let J = X.format?.includes("int"), Q = J ? "int" : "number", [Y, W] = TW[X.format];
  $._zod.onattach.push((z) => {
    let G = z._zod.bag;
    if (G.format = X.format, G.minimum = Y, G.maximum = W, J) G.pattern = zz;
  }), $._zod.check = (z) => {
    let G = z.value;
    if (J) {
      if (!Number.isInteger(G)) {
        z.issues.push({ expected: Q, format: X.format, code: "invalid_type", input: G, inst: $ });
        return;
      }
      if (!Number.isSafeInteger(G)) {
        if (G > 0) z.issues.push({ input: G, code: "too_big", maximum: Number.MAX_SAFE_INTEGER, note: "Integers must be within the safe integer range.", inst: $, origin: Q, continue: !X.abort });
        else z.issues.push({ input: G, code: "too_small", minimum: Number.MIN_SAFE_INTEGER, note: "Integers must be within the safe integer range.", inst: $, origin: Q, continue: !X.abort });
        return;
      }
    }
    if (G < Y) z.issues.push({ origin: "number", input: G, code: "too_small", minimum: Y, inclusive: true, inst: $, continue: !X.abort });
    if (G > W) z.issues.push({ origin: "number", input: G, code: "too_big", maximum: W, inst: $ });
  };
});
var Bz = q("$ZodCheckBigIntFormat", ($, X) => {
  A$.init($, X);
  let [J, Q] = yW[X.format];
  $._zod.onattach.push((Y) => {
    let W = Y._zod.bag;
    W.format = X.format, W.minimum = J, W.maximum = Q;
  }), $._zod.check = (Y) => {
    let W = Y.value;
    if (W < J) Y.issues.push({ origin: "bigint", input: W, code: "too_small", minimum: J, inclusive: true, inst: $, continue: !X.abort });
    if (W > Q) Y.issues.push({ origin: "bigint", input: W, code: "too_big", maximum: Q, inst: $ });
  };
});
var qz = q("$ZodCheckMaxSize", ($, X) => {
  A$.init($, X), $._zod.when = (J) => {
    let Q = J.value;
    return !m4(Q) && Q.size !== void 0;
  }, $._zod.onattach.push((J) => {
    let Q = J._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (X.maximum < Q) J._zod.bag.maximum = X.maximum;
  }), $._zod.check = (J) => {
    let Q = J.value;
    if (Q.size <= X.maximum) return;
    J.issues.push({ origin: SX(Q), code: "too_big", maximum: X.maximum, input: Q, inst: $, continue: !X.abort });
  };
});
var Lz = q("$ZodCheckMinSize", ($, X) => {
  A$.init($, X), $._zod.when = (J) => {
    let Q = J.value;
    return !m4(Q) && Q.size !== void 0;
  }, $._zod.onattach.push((J) => {
    let Q = J._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (X.minimum > Q) J._zod.bag.minimum = X.minimum;
  }), $._zod.check = (J) => {
    let Q = J.value;
    if (Q.size >= X.minimum) return;
    J.issues.push({ origin: SX(Q), code: "too_small", minimum: X.minimum, input: Q, inst: $, continue: !X.abort });
  };
});
var Dz = q("$ZodCheckSizeEquals", ($, X) => {
  A$.init($, X), $._zod.when = (J) => {
    let Q = J.value;
    return !m4(Q) && Q.size !== void 0;
  }, $._zod.onattach.push((J) => {
    let Q = J._zod.bag;
    Q.minimum = X.size, Q.maximum = X.size, Q.size = X.size;
  }), $._zod.check = (J) => {
    let Q = J.value, Y = Q.size;
    if (Y === X.size) return;
    let W = Y > X.size;
    J.issues.push({ origin: SX(Q), ...W ? { code: "too_big", maximum: X.size } : { code: "too_small", minimum: X.size }, inclusive: true, exact: true, input: J.value, inst: $, continue: !X.abort });
  };
});
var jz = q("$ZodCheckMaxLength", ($, X) => {
  A$.init($, X), $._zod.when = (J) => {
    let Q = J.value;
    return !m4(Q) && Q.length !== void 0;
  }, $._zod.onattach.push((J) => {
    let Q = J._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (X.maximum < Q) J._zod.bag.maximum = X.maximum;
  }), $._zod.check = (J) => {
    let Q = J.value;
    if (Q.length <= X.maximum) return;
    let W = vX(Q);
    J.issues.push({ origin: W, code: "too_big", maximum: X.maximum, inclusive: true, input: Q, inst: $, continue: !X.abort });
  };
});
var Fz = q("$ZodCheckMinLength", ($, X) => {
  A$.init($, X), $._zod.when = (J) => {
    let Q = J.value;
    return !m4(Q) && Q.length !== void 0;
  }, $._zod.onattach.push((J) => {
    let Q = J._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (X.minimum > Q) J._zod.bag.minimum = X.minimum;
  }), $._zod.check = (J) => {
    let Q = J.value;
    if (Q.length >= X.minimum) return;
    let W = vX(Q);
    J.issues.push({ origin: W, code: "too_small", minimum: X.minimum, inclusive: true, input: Q, inst: $, continue: !X.abort });
  };
});
var Mz = q("$ZodCheckLengthEquals", ($, X) => {
  A$.init($, X), $._zod.when = (J) => {
    let Q = J.value;
    return !m4(Q) && Q.length !== void 0;
  }, $._zod.onattach.push((J) => {
    let Q = J._zod.bag;
    Q.minimum = X.length, Q.maximum = X.length, Q.length = X.length;
  }), $._zod.check = (J) => {
    let Q = J.value, Y = Q.length;
    if (Y === X.length) return;
    let W = vX(Q), z = Y > X.length;
    J.issues.push({ origin: W, ...z ? { code: "too_big", maximum: X.length } : { code: "too_small", minimum: X.length }, inclusive: true, exact: true, input: J.value, inst: $, continue: !X.abort });
  };
});
var E0 = q("$ZodCheckStringFormat", ($, X) => {
  var J, Q;
  if (A$.init($, X), $._zod.onattach.push((Y) => {
    let W = Y._zod.bag;
    if (W.format = X.format, X.pattern) W.patterns ?? (W.patterns = /* @__PURE__ */ new Set()), W.patterns.add(X.pattern);
  }), X.pattern) (J = $._zod).check ?? (J.check = (Y) => {
    if (X.pattern.lastIndex = 0, X.pattern.test(Y.value)) return;
    Y.issues.push({ origin: "string", code: "invalid_format", format: X.format, input: Y.value, ...X.pattern ? { pattern: X.pattern.toString() } : {}, inst: $, continue: !X.abort });
  });
  else (Q = $._zod).check ?? (Q.check = () => {
  });
});
var Az = q("$ZodCheckRegex", ($, X) => {
  E0.init($, X), $._zod.check = (J) => {
    if (X.pattern.lastIndex = 0, X.pattern.test(J.value)) return;
    J.issues.push({ origin: "string", code: "invalid_format", format: "regex", input: J.value, pattern: X.pattern.toString(), inst: $, continue: !X.abort });
  };
});
var Iz = q("$ZodCheckLowerCase", ($, X) => {
  X.pattern ?? (X.pattern = Vz), E0.init($, X);
});
var bz = q("$ZodCheckUpperCase", ($, X) => {
  X.pattern ?? (X.pattern = Nz), E0.init($, X);
});
var Zz = q("$ZodCheckIncludes", ($, X) => {
  A$.init($, X);
  let J = D4(X.includes), Q = new RegExp(typeof X.position === "number" ? `^.{${X.position}}${J}` : J);
  X.pattern = Q, $._zod.onattach.push((Y) => {
    let W = Y._zod.bag;
    W.patterns ?? (W.patterns = /* @__PURE__ */ new Set()), W.patterns.add(Q);
  }), $._zod.check = (Y) => {
    if (Y.value.includes(X.includes, X.position)) return;
    Y.issues.push({ origin: "string", code: "invalid_format", format: "includes", includes: X.includes, input: Y.value, inst: $, continue: !X.abort });
  };
});
var Pz = q("$ZodCheckStartsWith", ($, X) => {
  A$.init($, X);
  let J = new RegExp(`^${D4(X.prefix)}.*`);
  X.pattern ?? (X.pattern = J), $._zod.onattach.push((Q) => {
    let Y = Q._zod.bag;
    Y.patterns ?? (Y.patterns = /* @__PURE__ */ new Set()), Y.patterns.add(J);
  }), $._zod.check = (Q) => {
    if (Q.value.startsWith(X.prefix)) return;
    Q.issues.push({ origin: "string", code: "invalid_format", format: "starts_with", prefix: X.prefix, input: Q.value, inst: $, continue: !X.abort });
  };
});
var Rz = q("$ZodCheckEndsWith", ($, X) => {
  A$.init($, X);
  let J = new RegExp(`.*${D4(X.suffix)}$`);
  X.pattern ?? (X.pattern = J), $._zod.onattach.push((Q) => {
    let Y = Q._zod.bag;
    Y.patterns ?? (Y.patterns = /* @__PURE__ */ new Set()), Y.patterns.add(J);
  }), $._zod.check = (Q) => {
    if (Q.value.endsWith(X.suffix)) return;
    Q.issues.push({ origin: "string", code: "invalid_format", format: "ends_with", suffix: X.suffix, input: Q.value, inst: $, continue: !X.abort });
  };
});
function aV($, X, J) {
  if ($.issues.length) X.issues.push(...z6(J, $.issues));
}
var Ez = q("$ZodCheckProperty", ($, X) => {
  A$.init($, X), $._zod.check = (J) => {
    let Q = X.schema._zod.run({ value: J.value[X.property], issues: [] }, {});
    if (Q instanceof Promise) return Q.then((Y) => aV(Y, J, X.property));
    aV(Q, J, X.property);
    return;
  };
});
var Sz = q("$ZodCheckMimeType", ($, X) => {
  A$.init($, X);
  let J = new Set(X.mime);
  $._zod.onattach.push((Q) => {
    Q._zod.bag.mime = X.mime;
  }), $._zod.check = (Q) => {
    if (J.has(Q.value.type)) return;
    Q.issues.push({ code: "invalid_value", values: X.mime, input: Q.value.type, inst: $ });
  };
});
var vz = q("$ZodCheckOverwrite", ($, X) => {
  A$.init($, X), $._zod.check = (J) => {
    J.value = X.tx(J.value);
  };
});
var DY = class {
  constructor($ = []) {
    if (this.content = [], this.indent = 0, this) this.args = $;
  }
  indented($) {
    this.indent += 1, $(this), this.indent -= 1;
  }
  write($) {
    if (typeof $ === "function") {
      $(this, { execution: "sync" }), $(this, { execution: "async" });
      return;
    }
    let J = $.split(`
`).filter((W) => W), Q = Math.min(...J.map((W) => W.length - W.trimStart().length)), Y = J.map((W) => W.slice(Q)).map((W) => " ".repeat(this.indent * 2) + W);
    for (let W of Y) this.content.push(W);
  }
  compile() {
    let $ = Function, X = this?.args, Q = [...(this?.content ?? [""]).map((Y) => `  ${Y}`)];
    return new $(...X, Q.join(`
`));
  }
};
var Cz = { major: 4, minor: 0, patch: 0 };
var d = q("$ZodType", ($, X) => {
  var J;
  $ ?? ($ = {}), $._zod.def = X, $._zod.bag = $._zod.bag || {}, $._zod.version = Cz;
  let Q = [...$._zod.def.checks ?? []];
  if ($._zod.traits.has("$ZodCheck")) Q.unshift($);
  for (let Y of Q) for (let W of Y._zod.onattach) W($);
  if (Q.length === 0) (J = $._zod).deferred ?? (J.deferred = []), $._zod.deferred?.push(() => {
    $._zod.run = $._zod.parse;
  });
  else {
    let Y = (W, z, G) => {
      let U = R1(W), H;
      for (let K of z) {
        if (K._zod.when) {
          if (!K._zod.when(W)) continue;
        } else if (U) continue;
        let V = W.issues.length, N = K._zod.check(W);
        if (N instanceof Promise && G?.async === false) throw new L4();
        if (H || N instanceof Promise) H = (H ?? Promise.resolve()).then(async () => {
          if (await N, W.issues.length === V) return;
          if (!U) U = R1(W, V);
        });
        else {
          if (W.issues.length === V) continue;
          if (!U) U = R1(W, V);
        }
      }
      if (H) return H.then(() => {
        return W;
      });
      return W;
    };
    $._zod.run = (W, z) => {
      let G = $._zod.parse(W, z);
      if (G instanceof Promise) {
        if (z.async === false) throw new L4();
        return G.then((U) => Y(U, Q, z));
      }
      return Y(G, Q, z);
    };
  }
  $["~standard"] = { validate: (Y) => {
    try {
      let W = l4($, Y);
      return W.success ? { value: W.data } : { issues: W.error?.issues };
    } catch (W) {
      return c4($, Y).then((z) => z.success ? { value: z.data } : { issues: z.error?.issues });
    }
  }, vendor: "zod", version: 1 };
});
var d4 = q("$ZodString", ($, X) => {
  d.init($, X), $._zod.pattern = [...$?._zod.bag?.patterns ?? []].pop() ?? Qz($._zod.bag), $._zod.parse = (J, Q) => {
    if (X.coerce) try {
      J.value = String(J.value);
    } catch (Y) {
    }
    if (typeof J.value === "string") return J;
    return J.issues.push({ expected: "string", code: "invalid_type", input: J.value, inst: $ }), J;
  };
});
var H$ = q("$ZodStringFormat", ($, X) => {
  E0.init($, X), d4.init($, X);
});
var MY = q("$ZodGUID", ($, X) => {
  X.pattern ?? (X.pattern = dW), H$.init($, X);
});
var AY = q("$ZodUUID", ($, X) => {
  if (X.version) {
    let Q = { v1: 1, v2: 2, v3: 3, v4: 4, v5: 5, v6: 6, v7: 7, v8: 8 }[X.version];
    if (Q === void 0) throw Error(`Invalid UUID version: "${X.version}"`);
    X.pattern ?? (X.pattern = v1(Q));
  } else X.pattern ?? (X.pattern = v1());
  H$.init($, X);
});
var IY = q("$ZodEmail", ($, X) => {
  X.pattern ?? (X.pattern = iW), H$.init($, X);
});
var bY = q("$ZodURL", ($, X) => {
  H$.init($, X), $._zod.check = (J) => {
    try {
      let Q = J.value, Y = new URL(Q), W = Y.href;
      if (X.hostname) {
        if (X.hostname.lastIndex = 0, !X.hostname.test(Y.hostname)) J.issues.push({ code: "invalid_format", format: "url", note: "Invalid hostname", pattern: eW.source, input: J.value, inst: $, continue: !X.abort });
      }
      if (X.protocol) {
        if (X.protocol.lastIndex = 0, !X.protocol.test(Y.protocol.endsWith(":") ? Y.protocol.slice(0, -1) : Y.protocol)) J.issues.push({ code: "invalid_format", format: "url", note: "Invalid protocol", pattern: X.protocol.source, input: J.value, inst: $, continue: !X.abort });
      }
      if (!Q.endsWith("/") && W.endsWith("/")) J.value = W.slice(0, -1);
      else J.value = W;
      return;
    } catch (Q) {
      J.issues.push({ code: "invalid_format", format: "url", input: J.value, inst: $, continue: !X.abort });
    }
  };
});
var ZY = q("$ZodEmoji", ($, X) => {
  X.pattern ?? (X.pattern = nW()), H$.init($, X);
});
var PY = q("$ZodNanoID", ($, X) => {
  X.pattern ?? (X.pattern = cW), H$.init($, X);
});
var RY = q("$ZodCUID", ($, X) => {
  X.pattern ?? (X.pattern = gW), H$.init($, X);
});
var EY = q("$ZodCUID2", ($, X) => {
  X.pattern ?? (X.pattern = hW), H$.init($, X);
});
var SY = q("$ZodULID", ($, X) => {
  X.pattern ?? (X.pattern = uW), H$.init($, X);
});
var vY = q("$ZodXID", ($, X) => {
  X.pattern ?? (X.pattern = mW), H$.init($, X);
});
var CY = q("$ZodKSUID", ($, X) => {
  X.pattern ?? (X.pattern = lW), H$.init($, X);
});
var _z = q("$ZodISODateTime", ($, X) => {
  X.pattern ?? (X.pattern = Yz(X)), H$.init($, X);
});
var xz = q("$ZodISODate", ($, X) => {
  X.pattern ?? (X.pattern = Xz), H$.init($, X);
});
var Tz = q("$ZodISOTime", ($, X) => {
  X.pattern ?? (X.pattern = Jz(X)), H$.init($, X);
});
var yz = q("$ZodISODuration", ($, X) => {
  X.pattern ?? (X.pattern = pW), H$.init($, X);
});
var kY = q("$ZodIPv4", ($, X) => {
  X.pattern ?? (X.pattern = rW), H$.init($, X), $._zod.onattach.push((J) => {
    let Q = J._zod.bag;
    Q.format = "ipv4";
  });
});
var _Y = q("$ZodIPv6", ($, X) => {
  X.pattern ?? (X.pattern = oW), H$.init($, X), $._zod.onattach.push((J) => {
    let Q = J._zod.bag;
    Q.format = "ipv6";
  }), $._zod.check = (J) => {
    try {
      new URL(`http://[${J.value}]`);
    } catch {
      J.issues.push({ code: "invalid_format", format: "ipv6", input: J.value, inst: $, continue: !X.abort });
    }
  };
});
var xY = q("$ZodCIDRv4", ($, X) => {
  X.pattern ?? (X.pattern = tW), H$.init($, X);
});
var TY = q("$ZodCIDRv6", ($, X) => {
  X.pattern ?? (X.pattern = aW), H$.init($, X), $._zod.check = (J) => {
    let [Q, Y] = J.value.split("/");
    try {
      if (!Y) throw Error();
      let W = Number(Y);
      if (`${W}` !== Y) throw Error();
      if (W < 0 || W > 128) throw Error();
      new URL(`http://[${Q}]`);
    } catch {
      J.issues.push({ code: "invalid_format", format: "cidrv6", input: J.value, inst: $, continue: !X.abort });
    }
  };
});
function fz($) {
  if ($ === "") return true;
  if ($.length % 4 !== 0) return false;
  try {
    return atob($), true;
  } catch {
    return false;
  }
}
var yY = q("$ZodBase64", ($, X) => {
  X.pattern ?? (X.pattern = sW), H$.init($, X), $._zod.onattach.push((J) => {
    J._zod.bag.contentEncoding = "base64";
  }), $._zod.check = (J) => {
    if (fz(J.value)) return;
    J.issues.push({ code: "invalid_format", format: "base64", input: J.value, inst: $, continue: !X.abort });
  };
});
function VN($) {
  if (!BY.test($)) return false;
  let X = $.replace(/[-_]/g, (Q) => Q === "-" ? "+" : "/"), J = X.padEnd(Math.ceil(X.length / 4) * 4, "=");
  return fz(J);
}
var fY = q("$ZodBase64URL", ($, X) => {
  X.pattern ?? (X.pattern = BY), H$.init($, X), $._zod.onattach.push((J) => {
    J._zod.bag.contentEncoding = "base64url";
  }), $._zod.check = (J) => {
    if (VN(J.value)) return;
    J.issues.push({ code: "invalid_format", format: "base64url", input: J.value, inst: $, continue: !X.abort });
  };
});
var gY = q("$ZodE164", ($, X) => {
  X.pattern ?? (X.pattern = $z), H$.init($, X);
});
function NN($, X = null) {
  try {
    let J = $.split(".");
    if (J.length !== 3) return false;
    let [Q] = J;
    if (!Q) return false;
    let Y = JSON.parse(atob(Q));
    if ("typ" in Y && Y?.typ !== "JWT") return false;
    if (!Y.alg) return false;
    if (X && (!("alg" in Y) || Y.alg !== X)) return false;
    return true;
  } catch {
    return false;
  }
}
var hY = q("$ZodJWT", ($, X) => {
  H$.init($, X), $._zod.check = (J) => {
    if (NN(J.value, X.alg)) return;
    J.issues.push({ code: "invalid_format", format: "jwt", input: J.value, inst: $, continue: !X.abort });
  };
});
var uY = q("$ZodCustomStringFormat", ($, X) => {
  H$.init($, X), $._zod.check = (J) => {
    if (X.fn(J.value)) return;
    J.issues.push({ code: "invalid_format", format: X.format, input: J.value, inst: $, continue: !X.abort });
  };
});
var kX = q("$ZodNumber", ($, X) => {
  d.init($, X), $._zod.pattern = $._zod.bag.pattern ?? Gz, $._zod.parse = (J, Q) => {
    if (X.coerce) try {
      J.value = Number(J.value);
    } catch (z) {
    }
    let Y = J.value;
    if (typeof Y === "number" && !Number.isNaN(Y) && Number.isFinite(Y)) return J;
    let W = typeof Y === "number" ? Number.isNaN(Y) ? "NaN" : !Number.isFinite(Y) ? "Infinity" : void 0 : void 0;
    return J.issues.push({ expected: "number", code: "invalid_type", input: Y, inst: $, ...W ? { received: W } : {} }), J;
  };
});
var mY = q("$ZodNumber", ($, X) => {
  wz.init($, X), kX.init($, X);
});
var S0 = q("$ZodBoolean", ($, X) => {
  d.init($, X), $._zod.pattern = Uz, $._zod.parse = (J, Q) => {
    if (X.coerce) try {
      J.value = Boolean(J.value);
    } catch (W) {
    }
    let Y = J.value;
    if (typeof Y === "boolean") return J;
    return J.issues.push({ expected: "boolean", code: "invalid_type", input: Y, inst: $ }), J;
  };
});
var _X = q("$ZodBigInt", ($, X) => {
  d.init($, X), $._zod.pattern = Wz, $._zod.parse = (J, Q) => {
    if (X.coerce) try {
      J.value = BigInt(J.value);
    } catch (Y) {
    }
    if (typeof J.value === "bigint") return J;
    return J.issues.push({ expected: "bigint", code: "invalid_type", input: J.value, inst: $ }), J;
  };
});
var lY = q("$ZodBigInt", ($, X) => {
  Bz.init($, X), _X.init($, X);
});
var cY = q("$ZodSymbol", ($, X) => {
  d.init($, X), $._zod.parse = (J, Q) => {
    let Y = J.value;
    if (typeof Y === "symbol") return J;
    return J.issues.push({ expected: "symbol", code: "invalid_type", input: Y, inst: $ }), J;
  };
});
var pY = q("$ZodUndefined", ($, X) => {
  d.init($, X), $._zod.pattern = Kz, $._zod.values = /* @__PURE__ */ new Set([void 0]), $._zod.optin = "optional", $._zod.optout = "optional", $._zod.parse = (J, Q) => {
    let Y = J.value;
    if (typeof Y > "u") return J;
    return J.issues.push({ expected: "undefined", code: "invalid_type", input: Y, inst: $ }), J;
  };
});
var dY = q("$ZodNull", ($, X) => {
  d.init($, X), $._zod.pattern = Hz, $._zod.values = /* @__PURE__ */ new Set([null]), $._zod.parse = (J, Q) => {
    let Y = J.value;
    if (Y === null) return J;
    return J.issues.push({ expected: "null", code: "invalid_type", input: Y, inst: $ }), J;
  };
});
var iY = q("$ZodAny", ($, X) => {
  d.init($, X), $._zod.parse = (J) => J;
});
var C1 = q("$ZodUnknown", ($, X) => {
  d.init($, X), $._zod.parse = (J) => J;
});
var nY = q("$ZodNever", ($, X) => {
  d.init($, X), $._zod.parse = (J, Q) => {
    return J.issues.push({ expected: "never", code: "invalid_type", input: J.value, inst: $ }), J;
  };
});
var rY = q("$ZodVoid", ($, X) => {
  d.init($, X), $._zod.parse = (J, Q) => {
    let Y = J.value;
    if (typeof Y > "u") return J;
    return J.issues.push({ expected: "void", code: "invalid_type", input: Y, inst: $ }), J;
  };
});
var oY = q("$ZodDate", ($, X) => {
  d.init($, X), $._zod.parse = (J, Q) => {
    if (X.coerce) try {
      J.value = new Date(J.value);
    } catch (G) {
    }
    let Y = J.value, W = Y instanceof Date;
    if (W && !Number.isNaN(Y.getTime())) return J;
    return J.issues.push({ expected: "date", code: "invalid_type", input: Y, ...W ? { received: "Invalid Date" } : {}, inst: $ }), J;
  };
});
function $N($, X, J) {
  if ($.issues.length) X.issues.push(...z6(J, $.issues));
  X.value[J] = $.value;
}
var v0 = q("$ZodArray", ($, X) => {
  d.init($, X), $._zod.parse = (J, Q) => {
    let Y = J.value;
    if (!Array.isArray(Y)) return J.issues.push({ expected: "array", code: "invalid_type", input: Y, inst: $ }), J;
    J.value = Array(Y.length);
    let W = [];
    for (let z = 0; z < Y.length; z++) {
      let G = Y[z], U = X.element._zod.run({ value: G, issues: [] }, Q);
      if (U instanceof Promise) W.push(U.then((H) => $N(H, J, z)));
      else $N(U, J, z);
    }
    if (W.length) return Promise.all(W).then(() => J);
    return J;
  };
});
function jY($, X, J) {
  if ($.issues.length) X.issues.push(...z6(J, $.issues));
  X.value[J] = $.value;
}
function XN($, X, J, Q) {
  if ($.issues.length) if (Q[J] === void 0) if (J in Q) X.value[J] = void 0;
  else X.value[J] = $.value;
  else X.issues.push(...z6(J, $.issues));
  else if ($.value === void 0) {
    if (J in Q) X.value[J] = void 0;
  } else X.value[J] = $.value;
}
var xX = q("$ZodObject", ($, X) => {
  d.init($, X);
  let J = PX(() => {
    let V = Object.keys(X.shape);
    for (let O of V) if (!(X.shape[O] instanceof d)) throw Error(`Invalid element at key "${O}": expected a Zod schema`);
    let N = xW(X.shape);
    return { shape: X.shape, keys: V, keySet: new Set(V), numKeys: V.length, optionalKeys: new Set(N) };
  });
  G$($._zod, "propValues", () => {
    let V = X.shape, N = {};
    for (let O in V) {
      let w = V[O]._zod;
      if (w.values) {
        N[O] ?? (N[O] = /* @__PURE__ */ new Set());
        for (let B of w.values) N[O].add(B);
      }
    }
    return N;
  });
  let Q = (V) => {
    let N = new DY(["shape", "payload", "ctx"]), O = J.value, w = (A) => {
      let I = P1(A);
      return `shape[${I}]._zod.run({ value: input[${I}], issues: [] }, ctx)`;
    };
    N.write("const input = payload.value;");
    let B = /* @__PURE__ */ Object.create(null), D = 0;
    for (let A of O.keys) B[A] = `key_${D++}`;
    N.write("const newResult = {}");
    for (let A of O.keys) if (O.optionalKeys.has(A)) {
      let I = B[A];
      N.write(`const ${I} = ${w(A)};`);
      let x = P1(A);
      N.write(`
        if (${I}.issues.length) {
          if (input[${x}] === undefined) {
            if (${x} in input) {
              newResult[${x}] = undefined;
            }
          } else {
            payload.issues = payload.issues.concat(
              ${I}.issues.map((iss) => ({
                ...iss,
                path: iss.path ? [${x}, ...iss.path] : [${x}],
              }))
            );
          }
        } else if (${I}.value === undefined) {
          if (${x} in input) newResult[${x}] = undefined;
        } else {
          newResult[${x}] = ${I}.value;
        }
        `);
    } else {
      let I = B[A];
      N.write(`const ${I} = ${w(A)};`), N.write(`
          if (${I}.issues.length) payload.issues = payload.issues.concat(${I}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${P1(A)}, ...iss.path] : [${P1(A)}]
          })));`), N.write(`newResult[${P1(A)}] = ${I}.value`);
    }
    N.write("payload.value = newResult;"), N.write("return payload;");
    let j = N.compile();
    return (A, I) => j(V, A, I);
  }, Y, W = I0, z = !IX.jitless, U = z && kW.value, H = X.catchall, K;
  $._zod.parse = (V, N) => {
    K ?? (K = J.value);
    let O = V.value;
    if (!W(O)) return V.issues.push({ expected: "object", code: "invalid_type", input: O, inst: $ }), V;
    let w = [];
    if (z && U && N?.async === false && N.jitless !== true) {
      if (!Y) Y = Q(X.shape);
      V = Y(V, N);
    } else {
      V.value = {};
      let I = K.shape;
      for (let x of K.keys) {
        let T = I[x], U$ = T._zod.run({ value: O[x], issues: [] }, N), T$ = T._zod.optin === "optional" && T._zod.optout === "optional";
        if (U$ instanceof Promise) w.push(U$.then((n$) => T$ ? XN(n$, V, x, O) : jY(n$, V, x)));
        else if (T$) XN(U$, V, x, O);
        else jY(U$, V, x);
      }
    }
    if (!H) return w.length ? Promise.all(w).then(() => V) : V;
    let B = [], D = K.keySet, j = H._zod, A = j.def.type;
    for (let I of Object.keys(O)) {
      if (D.has(I)) continue;
      if (A === "never") {
        B.push(I);
        continue;
      }
      let x = j.run({ value: O[I], issues: [] }, N);
      if (x instanceof Promise) w.push(x.then((T) => jY(T, V, I)));
      else jY(x, V, I);
    }
    if (B.length) V.issues.push({ code: "unrecognized_keys", keys: B, input: O, inst: $ });
    if (!w.length) return V;
    return Promise.all(w).then(() => {
      return V;
    });
  };
});
function JN($, X, J, Q) {
  for (let Y of $) if (Y.issues.length === 0) return X.value = Y.value, X;
  return X.issues.push({ code: "invalid_union", input: X.value, inst: J, errors: $.map((Y) => Y.issues.map((W) => D6(W, Q, E$()))) }), X;
}
var TX = q("$ZodUnion", ($, X) => {
  d.init($, X), G$($._zod, "optin", () => X.options.some((J) => J._zod.optin === "optional") ? "optional" : void 0), G$($._zod, "optout", () => X.options.some((J) => J._zod.optout === "optional") ? "optional" : void 0), G$($._zod, "values", () => {
    if (X.options.every((J) => J._zod.values)) return new Set(X.options.flatMap((J) => Array.from(J._zod.values)));
    return;
  }), G$($._zod, "pattern", () => {
    if (X.options.every((J) => J._zod.pattern)) {
      let J = X.options.map((Q) => Q._zod.pattern);
      return new RegExp(`^(${J.map((Q) => RX(Q.source)).join("|")})$`);
    }
    return;
  }), $._zod.parse = (J, Q) => {
    let Y = false, W = [];
    for (let z of X.options) {
      let G = z._zod.run({ value: J.value, issues: [] }, Q);
      if (G instanceof Promise) W.push(G), Y = true;
      else {
        if (G.issues.length === 0) return G;
        W.push(G);
      }
    }
    if (!Y) return JN(W, J, $, Q);
    return Promise.all(W).then((z) => {
      return JN(z, J, $, Q);
    });
  };
});
var tY = q("$ZodDiscriminatedUnion", ($, X) => {
  TX.init($, X);
  let J = $._zod.parse;
  G$($._zod, "propValues", () => {
    let Y = {};
    for (let W of X.options) {
      let z = W._zod.propValues;
      if (!z || Object.keys(z).length === 0) throw Error(`Invalid discriminated union option at index "${X.options.indexOf(W)}"`);
      for (let [G, U] of Object.entries(z)) {
        if (!Y[G]) Y[G] = /* @__PURE__ */ new Set();
        for (let H of U) Y[G].add(H);
      }
    }
    return Y;
  });
  let Q = PX(() => {
    let Y = X.options, W = /* @__PURE__ */ new Map();
    for (let z of Y) {
      let G = z._zod.propValues[X.discriminator];
      if (!G || G.size === 0) throw Error(`Invalid discriminated union option at index "${X.options.indexOf(z)}"`);
      for (let U of G) {
        if (W.has(U)) throw Error(`Duplicate discriminator value "${String(U)}"`);
        W.set(U, z);
      }
    }
    return W;
  });
  $._zod.parse = (Y, W) => {
    let z = Y.value;
    if (!I0(z)) return Y.issues.push({ code: "invalid_type", expected: "object", input: z, inst: $ }), Y;
    let G = Q.value.get(z?.[X.discriminator]);
    if (G) return G._zod.run(Y, W);
    if (X.unionFallback) return J(Y, W);
    return Y.issues.push({ code: "invalid_union", errors: [], note: "No matching discriminator", input: z, path: [X.discriminator], inst: $ }), Y;
  };
});
var aY = q("$ZodIntersection", ($, X) => {
  d.init($, X), $._zod.parse = (J, Q) => {
    let Y = J.value, W = X.left._zod.run({ value: Y, issues: [] }, Q), z = X.right._zod.run({ value: Y, issues: [] }, Q);
    if (W instanceof Promise || z instanceof Promise) return Promise.all([W, z]).then(([U, H]) => {
      return YN(J, U, H);
    });
    return YN(J, W, z);
  };
});
function kz($, X) {
  if ($ === X) return { valid: true, data: $ };
  if ($ instanceof Date && X instanceof Date && +$ === +X) return { valid: true, data: $ };
  if (b0($) && b0(X)) {
    let J = Object.keys(X), Q = Object.keys($).filter((W) => J.indexOf(W) !== -1), Y = { ...$, ...X };
    for (let W of Q) {
      let z = kz($[W], X[W]);
      if (!z.valid) return { valid: false, mergeErrorPath: [W, ...z.mergeErrorPath] };
      Y[W] = z.data;
    }
    return { valid: true, data: Y };
  }
  if (Array.isArray($) && Array.isArray(X)) {
    if ($.length !== X.length) return { valid: false, mergeErrorPath: [] };
    let J = [];
    for (let Q = 0; Q < $.length; Q++) {
      let Y = $[Q], W = X[Q], z = kz(Y, W);
      if (!z.valid) return { valid: false, mergeErrorPath: [Q, ...z.mergeErrorPath] };
      J.push(z.data);
    }
    return { valid: true, data: J };
  }
  return { valid: false, mergeErrorPath: [] };
}
function YN($, X, J) {
  if (X.issues.length) $.issues.push(...X.issues);
  if (J.issues.length) $.issues.push(...J.issues);
  if (R1($)) return $;
  let Q = kz(X.value, J.value);
  if (!Q.valid) throw Error(`Unmergable intersection. Error path: ${JSON.stringify(Q.mergeErrorPath)}`);
  return $.value = Q.data, $;
}
var i4 = q("$ZodTuple", ($, X) => {
  d.init($, X);
  let J = X.items, Q = J.length - [...J].reverse().findIndex((Y) => Y._zod.optin !== "optional");
  $._zod.parse = (Y, W) => {
    let z = Y.value;
    if (!Array.isArray(z)) return Y.issues.push({ input: z, inst: $, expected: "tuple", code: "invalid_type" }), Y;
    Y.value = [];
    let G = [];
    if (!X.rest) {
      let H = z.length > J.length, K = z.length < Q - 1;
      if (H || K) return Y.issues.push({ input: z, inst: $, origin: "array", ...H ? { code: "too_big", maximum: J.length } : { code: "too_small", minimum: J.length } }), Y;
    }
    let U = -1;
    for (let H of J) {
      if (U++, U >= z.length) {
        if (U >= Q) continue;
      }
      let K = H._zod.run({ value: z[U], issues: [] }, W);
      if (K instanceof Promise) G.push(K.then((V) => FY(V, Y, U)));
      else FY(K, Y, U);
    }
    if (X.rest) {
      let H = z.slice(J.length);
      for (let K of H) {
        U++;
        let V = X.rest._zod.run({ value: K, issues: [] }, W);
        if (V instanceof Promise) G.push(V.then((N) => FY(N, Y, U)));
        else FY(V, Y, U);
      }
    }
    if (G.length) return Promise.all(G).then(() => Y);
    return Y;
  };
});
function FY($, X, J) {
  if ($.issues.length) X.issues.push(...z6(J, $.issues));
  X.value[J] = $.value;
}
var sY = q("$ZodRecord", ($, X) => {
  d.init($, X), $._zod.parse = (J, Q) => {
    let Y = J.value;
    if (!b0(Y)) return J.issues.push({ expected: "record", code: "invalid_type", input: Y, inst: $ }), J;
    let W = [];
    if (X.keyType._zod.values) {
      let z = X.keyType._zod.values;
      J.value = {};
      for (let U of z) if (typeof U === "string" || typeof U === "number" || typeof U === "symbol") {
        let H = X.valueType._zod.run({ value: Y[U], issues: [] }, Q);
        if (H instanceof Promise) W.push(H.then((K) => {
          if (K.issues.length) J.issues.push(...z6(U, K.issues));
          J.value[U] = K.value;
        }));
        else {
          if (H.issues.length) J.issues.push(...z6(U, H.issues));
          J.value[U] = H.value;
        }
      }
      let G;
      for (let U in Y) if (!z.has(U)) G = G ?? [], G.push(U);
      if (G && G.length > 0) J.issues.push({ code: "unrecognized_keys", input: Y, inst: $, keys: G });
    } else {
      J.value = {};
      for (let z of Reflect.ownKeys(Y)) {
        if (z === "__proto__") continue;
        let G = X.keyType._zod.run({ value: z, issues: [] }, Q);
        if (G instanceof Promise) throw Error("Async schemas not supported in object keys currently");
        if (G.issues.length) {
          J.issues.push({ origin: "record", code: "invalid_key", issues: G.issues.map((H) => D6(H, Q, E$())), input: z, path: [z], inst: $ }), J.value[G.value] = G.value;
          continue;
        }
        let U = X.valueType._zod.run({ value: Y[z], issues: [] }, Q);
        if (U instanceof Promise) W.push(U.then((H) => {
          if (H.issues.length) J.issues.push(...z6(z, H.issues));
          J.value[G.value] = H.value;
        }));
        else {
          if (U.issues.length) J.issues.push(...z6(z, U.issues));
          J.value[G.value] = U.value;
        }
      }
    }
    if (W.length) return Promise.all(W).then(() => J);
    return J;
  };
});
var eY = q("$ZodMap", ($, X) => {
  d.init($, X), $._zod.parse = (J, Q) => {
    let Y = J.value;
    if (!(Y instanceof Map)) return J.issues.push({ expected: "map", code: "invalid_type", input: Y, inst: $ }), J;
    let W = [];
    J.value = /* @__PURE__ */ new Map();
    for (let [z, G] of Y) {
      let U = X.keyType._zod.run({ value: z, issues: [] }, Q), H = X.valueType._zod.run({ value: G, issues: [] }, Q);
      if (U instanceof Promise || H instanceof Promise) W.push(Promise.all([U, H]).then(([K, V]) => {
        QN(K, V, J, z, Y, $, Q);
      }));
      else QN(U, H, J, z, Y, $, Q);
    }
    if (W.length) return Promise.all(W).then(() => J);
    return J;
  };
});
function QN($, X, J, Q, Y, W, z) {
  if ($.issues.length) if (EX.has(typeof Q)) J.issues.push(...z6(Q, $.issues));
  else J.issues.push({ origin: "map", code: "invalid_key", input: Y, inst: W, issues: $.issues.map((G) => D6(G, z, E$())) });
  if (X.issues.length) if (EX.has(typeof Q)) J.issues.push(...z6(Q, X.issues));
  else J.issues.push({ origin: "map", code: "invalid_element", input: Y, inst: W, key: Q, issues: X.issues.map((G) => D6(G, z, E$())) });
  J.value.set($.value, X.value);
}
var $7 = q("$ZodSet", ($, X) => {
  d.init($, X), $._zod.parse = (J, Q) => {
    let Y = J.value;
    if (!(Y instanceof Set)) return J.issues.push({ input: Y, inst: $, expected: "set", code: "invalid_type" }), J;
    let W = [];
    J.value = /* @__PURE__ */ new Set();
    for (let z of Y) {
      let G = X.valueType._zod.run({ value: z, issues: [] }, Q);
      if (G instanceof Promise) W.push(G.then((U) => WN(U, J)));
      else WN(G, J);
    }
    if (W.length) return Promise.all(W).then(() => J);
    return J;
  };
});
function WN($, X) {
  if ($.issues.length) X.issues.push(...$.issues);
  X.value.add($.value);
}
var X7 = q("$ZodEnum", ($, X) => {
  d.init($, X);
  let J = ZX(X.entries);
  $._zod.values = new Set(J), $._zod.pattern = new RegExp(`^(${J.filter((Q) => EX.has(typeof Q)).map((Q) => typeof Q === "string" ? D4(Q) : Q.toString()).join("|")})$`), $._zod.parse = (Q, Y) => {
    let W = Q.value;
    if ($._zod.values.has(W)) return Q;
    return Q.issues.push({ code: "invalid_value", values: J, input: W, inst: $ }), Q;
  };
});
var J7 = q("$ZodLiteral", ($, X) => {
  d.init($, X), $._zod.values = new Set(X.values), $._zod.pattern = new RegExp(`^(${X.values.map((J) => typeof J === "string" ? D4(J) : J ? J.toString() : String(J)).join("|")})$`), $._zod.parse = (J, Q) => {
    let Y = J.value;
    if ($._zod.values.has(Y)) return J;
    return J.issues.push({ code: "invalid_value", values: X.values, input: Y, inst: $ }), J;
  };
});
var Y7 = q("$ZodFile", ($, X) => {
  d.init($, X), $._zod.parse = (J, Q) => {
    let Y = J.value;
    if (Y instanceof File) return J;
    return J.issues.push({ expected: "file", code: "invalid_type", input: Y, inst: $ }), J;
  };
});
var C0 = q("$ZodTransform", ($, X) => {
  d.init($, X), $._zod.parse = (J, Q) => {
    let Y = X.transform(J.value, J);
    if (Q.async) return (Y instanceof Promise ? Y : Promise.resolve(Y)).then((z) => {
      return J.value = z, J;
    });
    if (Y instanceof Promise) throw new L4();
    return J.value = Y, J;
  };
});
var Q7 = q("$ZodOptional", ($, X) => {
  d.init($, X), $._zod.optin = "optional", $._zod.optout = "optional", G$($._zod, "values", () => {
    return X.innerType._zod.values ? /* @__PURE__ */ new Set([...X.innerType._zod.values, void 0]) : void 0;
  }), G$($._zod, "pattern", () => {
    let J = X.innerType._zod.pattern;
    return J ? new RegExp(`^(${RX(J.source)})?$`) : void 0;
  }), $._zod.parse = (J, Q) => {
    if (X.innerType._zod.optin === "optional") return X.innerType._zod.run(J, Q);
    if (J.value === void 0) return J;
    return X.innerType._zod.run(J, Q);
  };
});
var W7 = q("$ZodNullable", ($, X) => {
  d.init($, X), G$($._zod, "optin", () => X.innerType._zod.optin), G$($._zod, "optout", () => X.innerType._zod.optout), G$($._zod, "pattern", () => {
    let J = X.innerType._zod.pattern;
    return J ? new RegExp(`^(${RX(J.source)}|null)$`) : void 0;
  }), G$($._zod, "values", () => {
    return X.innerType._zod.values ? /* @__PURE__ */ new Set([...X.innerType._zod.values, null]) : void 0;
  }), $._zod.parse = (J, Q) => {
    if (J.value === null) return J;
    return X.innerType._zod.run(J, Q);
  };
});
var z7 = q("$ZodDefault", ($, X) => {
  d.init($, X), $._zod.optin = "optional", G$($._zod, "values", () => X.innerType._zod.values), $._zod.parse = (J, Q) => {
    if (J.value === void 0) return J.value = X.defaultValue, J;
    let Y = X.innerType._zod.run(J, Q);
    if (Y instanceof Promise) return Y.then((W) => zN(W, X));
    return zN(Y, X);
  };
});
function zN($, X) {
  if ($.value === void 0) $.value = X.defaultValue;
  return $;
}
var G7 = q("$ZodPrefault", ($, X) => {
  d.init($, X), $._zod.optin = "optional", G$($._zod, "values", () => X.innerType._zod.values), $._zod.parse = (J, Q) => {
    if (J.value === void 0) J.value = X.defaultValue;
    return X.innerType._zod.run(J, Q);
  };
});
var U7 = q("$ZodNonOptional", ($, X) => {
  d.init($, X), G$($._zod, "values", () => {
    let J = X.innerType._zod.values;
    return J ? new Set([...J].filter((Q) => Q !== void 0)) : void 0;
  }), $._zod.parse = (J, Q) => {
    let Y = X.innerType._zod.run(J, Q);
    if (Y instanceof Promise) return Y.then((W) => GN(W, $));
    return GN(Y, $);
  };
});
function GN($, X) {
  if (!$.issues.length && $.value === void 0) $.issues.push({ code: "invalid_type", expected: "nonoptional", input: $.value, inst: X });
  return $;
}
var H7 = q("$ZodSuccess", ($, X) => {
  d.init($, X), $._zod.parse = (J, Q) => {
    let Y = X.innerType._zod.run(J, Q);
    if (Y instanceof Promise) return Y.then((W) => {
      return J.value = W.issues.length === 0, J;
    });
    return J.value = Y.issues.length === 0, J;
  };
});
var K7 = q("$ZodCatch", ($, X) => {
  d.init($, X), $._zod.optin = "optional", G$($._zod, "optout", () => X.innerType._zod.optout), G$($._zod, "values", () => X.innerType._zod.values), $._zod.parse = (J, Q) => {
    let Y = X.innerType._zod.run(J, Q);
    if (Y instanceof Promise) return Y.then((W) => {
      if (J.value = W.value, W.issues.length) J.value = X.catchValue({ ...J, error: { issues: W.issues.map((z) => D6(z, Q, E$())) }, input: J.value }), J.issues = [];
      return J;
    });
    if (J.value = Y.value, Y.issues.length) J.value = X.catchValue({ ...J, error: { issues: Y.issues.map((W) => D6(W, Q, E$())) }, input: J.value }), J.issues = [];
    return J;
  };
});
var V7 = q("$ZodNaN", ($, X) => {
  d.init($, X), $._zod.parse = (J, Q) => {
    if (typeof J.value !== "number" || !Number.isNaN(J.value)) return J.issues.push({ input: J.value, inst: $, expected: "nan", code: "invalid_type" }), J;
    return J;
  };
});
var k0 = q("$ZodPipe", ($, X) => {
  d.init($, X), G$($._zod, "values", () => X.in._zod.values), G$($._zod, "optin", () => X.in._zod.optin), G$($._zod, "optout", () => X.out._zod.optout), $._zod.parse = (J, Q) => {
    let Y = X.in._zod.run(J, Q);
    if (Y instanceof Promise) return Y.then((W) => UN(W, X, Q));
    return UN(Y, X, Q);
  };
});
function UN($, X, J) {
  if (R1($)) return $;
  return X.out._zod.run({ value: $.value, issues: $.issues }, J);
}
var N7 = q("$ZodReadonly", ($, X) => {
  d.init($, X), G$($._zod, "propValues", () => X.innerType._zod.propValues), G$($._zod, "values", () => X.innerType._zod.values), G$($._zod, "optin", () => X.innerType._zod.optin), G$($._zod, "optout", () => X.innerType._zod.optout), $._zod.parse = (J, Q) => {
    let Y = X.innerType._zod.run(J, Q);
    if (Y instanceof Promise) return Y.then(HN);
    return HN(Y);
  };
});
function HN($) {
  return $.value = Object.freeze($.value), $;
}
var O7 = q("$ZodTemplateLiteral", ($, X) => {
  d.init($, X);
  let J = [];
  for (let Q of X.parts) if (Q instanceof d) {
    if (!Q._zod.pattern) throw Error(`Invalid template literal part, no pattern found: ${[...Q._zod.traits].shift()}`);
    let Y = Q._zod.pattern instanceof RegExp ? Q._zod.pattern.source : Q._zod.pattern;
    if (!Y) throw Error(`Invalid template literal part: ${Q._zod.traits}`);
    let W = Y.startsWith("^") ? 1 : 0, z = Y.endsWith("$") ? Y.length - 1 : Y.length;
    J.push(Y.slice(W, z));
  } else if (Q === null || _W.has(typeof Q)) J.push(D4(`${Q}`));
  else throw Error(`Invalid template literal part: ${Q}`);
  $._zod.pattern = new RegExp(`^${J.join("")}$`), $._zod.parse = (Q, Y) => {
    if (typeof Q.value !== "string") return Q.issues.push({ input: Q.value, inst: $, expected: "template_literal", code: "invalid_type" }), Q;
    if ($._zod.pattern.lastIndex = 0, !$._zod.pattern.test(Q.value)) return Q.issues.push({ input: Q.value, inst: $, code: "invalid_format", format: "template_literal", pattern: $._zod.pattern.source }), Q;
    return Q;
  };
});
var w7 = q("$ZodPromise", ($, X) => {
  d.init($, X), $._zod.parse = (J, Q) => {
    return Promise.resolve(J.value).then((Y) => X.innerType._zod.run({ value: Y, issues: [] }, Q));
  };
});
var B7 = q("$ZodLazy", ($, X) => {
  d.init($, X), G$($._zod, "innerType", () => X.getter()), G$($._zod, "pattern", () => $._zod.innerType._zod.pattern), G$($._zod, "propValues", () => $._zod.innerType._zod.propValues), G$($._zod, "optin", () => $._zod.innerType._zod.optin), G$($._zod, "optout", () => $._zod.innerType._zod.optout), $._zod.parse = (J, Q) => {
    return $._zod.innerType._zod.run(J, Q);
  };
});
var q7 = q("$ZodCustom", ($, X) => {
  A$.init($, X), d.init($, X), $._zod.parse = (J, Q) => {
    return J;
  }, $._zod.check = (J) => {
    let Q = J.value, Y = X.fn(Q);
    if (Y instanceof Promise) return Y.then((W) => KN(W, J, Q, $));
    KN(Y, J, Q, $);
    return;
  };
});
function KN($, X, J, Q) {
  if (!$) {
    let Y = { code: "custom", input: J, inst: Q, path: [...Q._zod.def.path ?? []], continue: !Q._zod.def.abort };
    if (Q._zod.def.params) Y.params = Q._zod.def.params;
    X.issues.push(fW(Y));
  }
}
var _0 = {};
H1(_0, { zhTW: () => M3, zhCN: () => F3, vi: () => j3, ur: () => D3, ua: () => L3, tr: () => q3, th: () => B3, ta: () => w3, sv: () => O3, sl: () => N3, ru: () => V3, pt: () => K3, ps: () => U3, pl: () => H3, ota: () => G3, no: () => z3, nl: () => W3, ms: () => Q3, mk: () => Y3, ko: () => J3, kh: () => X3, ja: () => $3, it: () => ez, id: () => sz, hu: () => az, he: () => tz, frCA: () => oz, fr: () => rz, fi: () => nz, fa: () => iz, es: () => dz, eo: () => pz, en: () => yX, de: () => cz, cs: () => lz, ca: () => mz, be: () => uz, az: () => hz, ar: () => gz });
var CI = () => {
  let $ = { string: { unit: "\u062D\u0631\u0641", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" }, file: { unit: "\u0628\u0627\u064A\u062A", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" }, array: { unit: "\u0639\u0646\u0635\u0631", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" }, set: { unit: "\u0639\u0646\u0635\u0631", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "number";
      case "object": {
        if (Array.isArray(Y)) return "array";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "\u0645\u062F\u062E\u0644", email: "\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A", url: "\u0631\u0627\u0628\u0637", emoji: "\u0625\u064A\u0645\u0648\u062C\u064A", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "\u062A\u0627\u0631\u064A\u062E \u0648\u0648\u0642\u062A \u0628\u0645\u0639\u064A\u0627\u0631 ISO", date: "\u062A\u0627\u0631\u064A\u062E \u0628\u0645\u0639\u064A\u0627\u0631 ISO", time: "\u0648\u0642\u062A \u0628\u0645\u0639\u064A\u0627\u0631 ISO", duration: "\u0645\u062F\u0629 \u0628\u0645\u0639\u064A\u0627\u0631 ISO", ipv4: "\u0639\u0646\u0648\u0627\u0646 IPv4", ipv6: "\u0639\u0646\u0648\u0627\u0646 IPv6", cidrv4: "\u0645\u062F\u0649 \u0639\u0646\u0627\u0648\u064A\u0646 \u0628\u0635\u064A\u063A\u0629 IPv4", cidrv6: "\u0645\u062F\u0649 \u0639\u0646\u0627\u0648\u064A\u0646 \u0628\u0635\u064A\u063A\u0629 IPv6", base64: "\u0646\u064E\u0635 \u0628\u062A\u0631\u0645\u064A\u0632 base64-encoded", base64url: "\u0646\u064E\u0635 \u0628\u062A\u0631\u0645\u064A\u0632 base64url-encoded", json_string: "\u0646\u064E\u0635 \u0639\u0644\u0649 \u0647\u064A\u0626\u0629 JSON", e164: "\u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0628\u0645\u0639\u064A\u0627\u0631 E.164", jwt: "JWT", template_literal: "\u0645\u062F\u062E\u0644" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `\u0645\u062F\u062E\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644\u0629: \u064A\u0641\u062A\u0631\u0636 \u0625\u062F\u062E\u0627\u0644 ${Y.expected}\u060C \u0648\u0644\u0643\u0646 \u062A\u0645 \u0625\u062F\u062E\u0627\u0644 ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `\u0645\u062F\u062E\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644\u0629: \u064A\u0641\u062A\u0631\u0636 \u0625\u062F\u062E\u0627\u0644 ${S(Y.values[0])}`;
        return `\u0627\u062E\u062A\u064A\u0627\u0631 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062A\u0648\u0642\u0639 \u0627\u0646\u062A\u0642\u0627\u0621 \u0623\u062D\u062F \u0647\u0630\u0647 \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A: ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return ` \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0623\u0646 \u062A\u0643\u0648\u0646 ${Y.origin ?? "\u0627\u0644\u0642\u064A\u0645\u0629"} ${W} ${Y.maximum.toString()} ${z.unit ?? "\u0639\u0646\u0635\u0631"}`;
        return `\u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0623\u0646 \u062A\u0643\u0648\u0646 ${Y.origin ?? "\u0627\u0644\u0642\u064A\u0645\u0629"} ${W} ${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `\u0623\u0635\u063A\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0644\u0640 ${Y.origin} \u0623\u0646 \u064A\u0643\u0648\u0646 ${W} ${Y.minimum.toString()} ${z.unit}`;
        return `\u0623\u0635\u063A\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0644\u0640 ${Y.origin} \u0623\u0646 \u064A\u0643\u0648\u0646 ${W} ${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0628\u062F\u0623 \u0628\u0640 "${Y.prefix}"`;
        if (W.format === "ends_with") return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0646\u062A\u0647\u064A \u0628\u0640 "${W.suffix}"`;
        if (W.format === "includes") return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u062A\u0636\u0645\u0651\u064E\u0646 "${W.includes}"`;
        if (W.format === "regex") return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0637\u0627\u0628\u0642 \u0627\u0644\u0646\u0645\u0637 ${W.pattern}`;
        return `${Q[W.format] ?? Y.format} \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644`;
      }
      case "not_multiple_of":
        return `\u0631\u0642\u0645 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0645\u0646 \u0645\u0636\u0627\u0639\u0641\u0627\u062A ${Y.divisor}`;
      case "unrecognized_keys":
        return `\u0645\u0639\u0631\u0641${Y.keys.length > 1 ? "\u0627\u062A" : ""} \u063A\u0631\u064A\u0628${Y.keys.length > 1 ? "\u0629" : ""}: ${M(Y.keys, "\u060C ")}`;
      case "invalid_key":
        return `\u0645\u0639\u0631\u0641 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644 \u0641\u064A ${Y.origin}`;
      case "invalid_union":
        return "\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644";
      case "invalid_element":
        return `\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644 \u0641\u064A ${Y.origin}`;
      default:
        return "\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644";
    }
  };
};
function gz() {
  return { localeError: CI() };
}
var kI = () => {
  let $ = { string: { unit: "simvol", verb: "olmal\u0131d\u0131r" }, file: { unit: "bayt", verb: "olmal\u0131d\u0131r" }, array: { unit: "element", verb: "olmal\u0131d\u0131r" }, set: { unit: "element", verb: "olmal\u0131d\u0131r" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "number";
      case "object": {
        if (Array.isArray(Y)) return "array";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "input", email: "email address", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO datetime", date: "ISO date", time: "ISO time", duration: "ISO duration", ipv4: "IPv4 address", ipv6: "IPv6 address", cidrv4: "IPv4 range", cidrv6: "IPv6 range", base64: "base64-encoded string", base64url: "base64url-encoded string", json_string: "JSON string", e164: "E.164 number", jwt: "JWT", template_literal: "input" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `Yanl\u0131\u015F d\u0259y\u0259r: g\xF6zl\u0259nil\u0259n ${Y.expected}, daxil olan ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `Yanl\u0131\u015F d\u0259y\u0259r: g\xF6zl\u0259nil\u0259n ${S(Y.values[0])}`;
        return `Yanl\u0131\u015F se\xE7im: a\u015Fa\u011F\u0131dak\u0131lardan biri olmal\u0131d\u0131r: ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `\xC7ox b\xF6y\xFCk: g\xF6zl\u0259nil\u0259n ${Y.origin ?? "d\u0259y\u0259r"} ${W}${Y.maximum.toString()} ${z.unit ?? "element"}`;
        return `\xC7ox b\xF6y\xFCk: g\xF6zl\u0259nil\u0259n ${Y.origin ?? "d\u0259y\u0259r"} ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `\xC7ox ki\xE7ik: g\xF6zl\u0259nil\u0259n ${Y.origin} ${W}${Y.minimum.toString()} ${z.unit}`;
        return `\xC7ox ki\xE7ik: g\xF6zl\u0259nil\u0259n ${Y.origin} ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `Yanl\u0131\u015F m\u0259tn: "${W.prefix}" il\u0259 ba\u015Flamal\u0131d\u0131r`;
        if (W.format === "ends_with") return `Yanl\u0131\u015F m\u0259tn: "${W.suffix}" il\u0259 bitm\u0259lidir`;
        if (W.format === "includes") return `Yanl\u0131\u015F m\u0259tn: "${W.includes}" daxil olmal\u0131d\u0131r`;
        if (W.format === "regex") return `Yanl\u0131\u015F m\u0259tn: ${W.pattern} \u015Fablonuna uy\u011Fun olmal\u0131d\u0131r`;
        return `Yanl\u0131\u015F ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `Yanl\u0131\u015F \u0259d\u0259d: ${Y.divisor} il\u0259 b\xF6l\xFCn\u0259 bil\u0259n olmal\u0131d\u0131r`;
      case "unrecognized_keys":
        return `Tan\u0131nmayan a\xE7ar${Y.keys.length > 1 ? "lar" : ""}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `${Y.origin} daxilind\u0259 yanl\u0131\u015F a\xE7ar`;
      case "invalid_union":
        return "Yanl\u0131\u015F d\u0259y\u0259r";
      case "invalid_element":
        return `${Y.origin} daxilind\u0259 yanl\u0131\u015F d\u0259y\u0259r`;
      default:
        return "Yanl\u0131\u015F d\u0259y\u0259r";
    }
  };
};
function hz() {
  return { localeError: kI() };
}
function wN($, X, J, Q) {
  let Y = Math.abs($), W = Y % 10, z = Y % 100;
  if (z >= 11 && z <= 19) return Q;
  if (W === 1) return X;
  if (W >= 2 && W <= 4) return J;
  return Q;
}
var _I = () => {
  let $ = { string: { unit: { one: "\u0441\u0456\u043C\u0432\u0430\u043B", few: "\u0441\u0456\u043C\u0432\u0430\u043B\u044B", many: "\u0441\u0456\u043C\u0432\u0430\u043B\u0430\u045E" }, verb: "\u043C\u0435\u0446\u044C" }, array: { unit: { one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442", few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B", many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430\u045E" }, verb: "\u043C\u0435\u0446\u044C" }, set: { unit: { one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442", few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B", many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430\u045E" }, verb: "\u043C\u0435\u0446\u044C" }, file: { unit: { one: "\u0431\u0430\u0439\u0442", few: "\u0431\u0430\u0439\u0442\u044B", many: "\u0431\u0430\u0439\u0442\u0430\u045E" }, verb: "\u043C\u0435\u0446\u044C" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "\u043B\u0456\u043A";
      case "object": {
        if (Array.isArray(Y)) return "\u043C\u0430\u0441\u0456\u045E";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "\u0443\u0432\u043E\u0434", email: "email \u0430\u0434\u0440\u0430\u0441", url: "URL", emoji: "\u044D\u043C\u043E\u0434\u0437\u0456", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO \u0434\u0430\u0442\u0430 \u0456 \u0447\u0430\u0441", date: "ISO \u0434\u0430\u0442\u0430", time: "ISO \u0447\u0430\u0441", duration: "ISO \u043F\u0440\u0430\u0446\u044F\u0433\u043B\u0430\u0441\u0446\u044C", ipv4: "IPv4 \u0430\u0434\u0440\u0430\u0441", ipv6: "IPv6 \u0430\u0434\u0440\u0430\u0441", cidrv4: "IPv4 \u0434\u044B\u044F\u043F\u0430\u0437\u043E\u043D", cidrv6: "IPv6 \u0434\u044B\u044F\u043F\u0430\u0437\u043E\u043D", base64: "\u0440\u0430\u0434\u043E\u043A \u0443 \u0444\u0430\u0440\u043C\u0430\u0446\u0435 base64", base64url: "\u0440\u0430\u0434\u043E\u043A \u0443 \u0444\u0430\u0440\u043C\u0430\u0446\u0435 base64url", json_string: "JSON \u0440\u0430\u0434\u043E\u043A", e164: "\u043D\u0443\u043C\u0430\u0440 E.164", jwt: "JWT", template_literal: "\u0443\u0432\u043E\u0434" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434: \u0447\u0430\u043A\u0430\u045E\u0441\u044F ${Y.expected}, \u0430\u0442\u0440\u044B\u043C\u0430\u043D\u0430 ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F ${S(Y.values[0])}`;
        return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0432\u0430\u0440\u044B\u044F\u043D\u0442: \u0447\u0430\u043A\u0430\u045E\u0441\u044F \u0430\u0434\u0437\u0456\u043D \u0437 ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) {
          let G = Number(Y.maximum), U = wN(G, z.unit.one, z.unit.few, z.unit.many);
          return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u0432\u044F\u043B\u0456\u043A\u0456: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${Y.origin ?? "\u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435"} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 ${z.verb} ${W}${Y.maximum.toString()} ${U}`;
        }
        return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u0432\u044F\u043B\u0456\u043A\u0456: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${Y.origin ?? "\u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435"} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 \u0431\u044B\u0446\u044C ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) {
          let G = Number(Y.minimum), U = wN(G, z.unit.one, z.unit.few, z.unit.many);
          return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u043C\u0430\u043B\u044B: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${Y.origin} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 ${z.verb} ${W}${Y.minimum.toString()} ${U}`;
        }
        return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u043C\u0430\u043B\u044B: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${Y.origin} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 \u0431\u044B\u0446\u044C ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u043F\u0430\u0447\u044B\u043D\u0430\u0446\u0446\u0430 \u0437 "${W.prefix}"`;
        if (W.format === "ends_with") return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0437\u0430\u043A\u0430\u043D\u0447\u0432\u0430\u0446\u0446\u0430 \u043D\u0430 "${W.suffix}"`;
        if (W.format === "includes") return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0437\u043C\u044F\u0448\u0447\u0430\u0446\u044C "${W.includes}"`;
        if (W.format === "regex") return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0430\u0434\u043F\u0430\u0432\u044F\u0434\u0430\u0446\u044C \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${W.pattern}`;
        return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u043B\u0456\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0431\u044B\u0446\u044C \u043A\u0440\u0430\u0442\u043D\u044B\u043C ${Y.divisor}`;
      case "unrecognized_keys":
        return `\u041D\u0435\u0440\u0430\u0441\u043F\u0430\u0437\u043D\u0430\u043D\u044B ${Y.keys.length > 1 ? "\u043A\u043B\u044E\u0447\u044B" : "\u043A\u043B\u044E\u0447"}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u043A\u043B\u044E\u0447 \u0443 ${Y.origin}`;
      case "invalid_union":
        return "\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434";
      case "invalid_element":
        return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u0430\u0435 \u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435 \u045E ${Y.origin}`;
      default:
        return "\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434";
    }
  };
};
function uz() {
  return { localeError: _I() };
}
var xI = () => {
  let $ = { string: { unit: "car\xE0cters", verb: "contenir" }, file: { unit: "bytes", verb: "contenir" }, array: { unit: "elements", verb: "contenir" }, set: { unit: "elements", verb: "contenir" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "number";
      case "object": {
        if (Array.isArray(Y)) return "array";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "entrada", email: "adre\xE7a electr\xF2nica", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "data i hora ISO", date: "data ISO", time: "hora ISO", duration: "durada ISO", ipv4: "adre\xE7a IPv4", ipv6: "adre\xE7a IPv6", cidrv4: "rang IPv4", cidrv6: "rang IPv6", base64: "cadena codificada en base64", base64url: "cadena codificada en base64url", json_string: "cadena JSON", e164: "n\xFAmero E.164", jwt: "JWT", template_literal: "entrada" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `Tipus inv\xE0lid: s'esperava ${Y.expected}, s'ha rebut ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `Valor inv\xE0lid: s'esperava ${S(Y.values[0])}`;
        return `Opci\xF3 inv\xE0lida: s'esperava una de ${M(Y.values, " o ")}`;
      case "too_big": {
        let W = Y.inclusive ? "com a m\xE0xim" : "menys de", z = X(Y.origin);
        if (z) return `Massa gran: s'esperava que ${Y.origin ?? "el valor"} contingu\xE9s ${W} ${Y.maximum.toString()} ${z.unit ?? "elements"}`;
        return `Massa gran: s'esperava que ${Y.origin ?? "el valor"} fos ${W} ${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? "com a m\xEDnim" : "m\xE9s de", z = X(Y.origin);
        if (z) return `Massa petit: s'esperava que ${Y.origin} contingu\xE9s ${W} ${Y.minimum.toString()} ${z.unit}`;
        return `Massa petit: s'esperava que ${Y.origin} fos ${W} ${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `Format inv\xE0lid: ha de comen\xE7ar amb "${W.prefix}"`;
        if (W.format === "ends_with") return `Format inv\xE0lid: ha d'acabar amb "${W.suffix}"`;
        if (W.format === "includes") return `Format inv\xE0lid: ha d'incloure "${W.includes}"`;
        if (W.format === "regex") return `Format inv\xE0lid: ha de coincidir amb el patr\xF3 ${W.pattern}`;
        return `Format inv\xE0lid per a ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `N\xFAmero inv\xE0lid: ha de ser m\xFAltiple de ${Y.divisor}`;
      case "unrecognized_keys":
        return `Clau${Y.keys.length > 1 ? "s" : ""} no reconeguda${Y.keys.length > 1 ? "s" : ""}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `Clau inv\xE0lida a ${Y.origin}`;
      case "invalid_union":
        return "Entrada inv\xE0lida";
      case "invalid_element":
        return `Element inv\xE0lid a ${Y.origin}`;
      default:
        return "Entrada inv\xE0lida";
    }
  };
};
function mz() {
  return { localeError: xI() };
}
var TI = () => {
  let $ = { string: { unit: "znak\u016F", verb: "m\xEDt" }, file: { unit: "bajt\u016F", verb: "m\xEDt" }, array: { unit: "prvk\u016F", verb: "m\xEDt" }, set: { unit: "prvk\u016F", verb: "m\xEDt" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "\u010D\xEDslo";
      case "string":
        return "\u0159et\u011Bzec";
      case "boolean":
        return "boolean";
      case "bigint":
        return "bigint";
      case "function":
        return "funkce";
      case "symbol":
        return "symbol";
      case "undefined":
        return "undefined";
      case "object": {
        if (Array.isArray(Y)) return "pole";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "regul\xE1rn\xED v\xFDraz", email: "e-mailov\xE1 adresa", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "datum a \u010Das ve form\xE1tu ISO", date: "datum ve form\xE1tu ISO", time: "\u010Das ve form\xE1tu ISO", duration: "doba trv\xE1n\xED ISO", ipv4: "IPv4 adresa", ipv6: "IPv6 adresa", cidrv4: "rozsah IPv4", cidrv6: "rozsah IPv6", base64: "\u0159et\u011Bzec zak\xF3dovan\xFD ve form\xE1tu base64", base64url: "\u0159et\u011Bzec zak\xF3dovan\xFD ve form\xE1tu base64url", json_string: "\u0159et\u011Bzec ve form\xE1tu JSON", e164: "\u010D\xEDslo E.164", jwt: "JWT", template_literal: "vstup" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no ${Y.expected}, obdr\u017Eeno ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no ${S(Y.values[0])}`;
        return `Neplatn\xE1 mo\u017Enost: o\u010Dek\xE1v\xE1na jedna z hodnot ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `Hodnota je p\u0159\xEDli\u0161 velk\xE1: ${Y.origin ?? "hodnota"} mus\xED m\xEDt ${W}${Y.maximum.toString()} ${z.unit ?? "prvk\u016F"}`;
        return `Hodnota je p\u0159\xEDli\u0161 velk\xE1: ${Y.origin ?? "hodnota"} mus\xED b\xFDt ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `Hodnota je p\u0159\xEDli\u0161 mal\xE1: ${Y.origin ?? "hodnota"} mus\xED m\xEDt ${W}${Y.minimum.toString()} ${z.unit ?? "prvk\u016F"}`;
        return `Hodnota je p\u0159\xEDli\u0161 mal\xE1: ${Y.origin ?? "hodnota"} mus\xED b\xFDt ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `Neplatn\xFD \u0159et\u011Bzec: mus\xED za\u010D\xEDnat na "${W.prefix}"`;
        if (W.format === "ends_with") return `Neplatn\xFD \u0159et\u011Bzec: mus\xED kon\u010Dit na "${W.suffix}"`;
        if (W.format === "includes") return `Neplatn\xFD \u0159et\u011Bzec: mus\xED obsahovat "${W.includes}"`;
        if (W.format === "regex") return `Neplatn\xFD \u0159et\u011Bzec: mus\xED odpov\xEDdat vzoru ${W.pattern}`;
        return `Neplatn\xFD form\xE1t ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `Neplatn\xE9 \u010D\xEDslo: mus\xED b\xFDt n\xE1sobkem ${Y.divisor}`;
      case "unrecognized_keys":
        return `Nezn\xE1m\xE9 kl\xED\u010De: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `Neplatn\xFD kl\xED\u010D v ${Y.origin}`;
      case "invalid_union":
        return "Neplatn\xFD vstup";
      case "invalid_element":
        return `Neplatn\xE1 hodnota v ${Y.origin}`;
      default:
        return "Neplatn\xFD vstup";
    }
  };
};
function lz() {
  return { localeError: TI() };
}
var yI = () => {
  let $ = { string: { unit: "Zeichen", verb: "zu haben" }, file: { unit: "Bytes", verb: "zu haben" }, array: { unit: "Elemente", verb: "zu haben" }, set: { unit: "Elemente", verb: "zu haben" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "Zahl";
      case "object": {
        if (Array.isArray(Y)) return "Array";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "Eingabe", email: "E-Mail-Adresse", url: "URL", emoji: "Emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO-Datum und -Uhrzeit", date: "ISO-Datum", time: "ISO-Uhrzeit", duration: "ISO-Dauer", ipv4: "IPv4-Adresse", ipv6: "IPv6-Adresse", cidrv4: "IPv4-Bereich", cidrv6: "IPv6-Bereich", base64: "Base64-codierter String", base64url: "Base64-URL-codierter String", json_string: "JSON-String", e164: "E.164-Nummer", jwt: "JWT", template_literal: "Eingabe" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `Ung\xFCltige Eingabe: erwartet ${Y.expected}, erhalten ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `Ung\xFCltige Eingabe: erwartet ${S(Y.values[0])}`;
        return `Ung\xFCltige Option: erwartet eine von ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `Zu gro\xDF: erwartet, dass ${Y.origin ?? "Wert"} ${W}${Y.maximum.toString()} ${z.unit ?? "Elemente"} hat`;
        return `Zu gro\xDF: erwartet, dass ${Y.origin ?? "Wert"} ${W}${Y.maximum.toString()} ist`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `Zu klein: erwartet, dass ${Y.origin} ${W}${Y.minimum.toString()} ${z.unit} hat`;
        return `Zu klein: erwartet, dass ${Y.origin} ${W}${Y.minimum.toString()} ist`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `Ung\xFCltiger String: muss mit "${W.prefix}" beginnen`;
        if (W.format === "ends_with") return `Ung\xFCltiger String: muss mit "${W.suffix}" enden`;
        if (W.format === "includes") return `Ung\xFCltiger String: muss "${W.includes}" enthalten`;
        if (W.format === "regex") return `Ung\xFCltiger String: muss dem Muster ${W.pattern} entsprechen`;
        return `Ung\xFCltig: ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `Ung\xFCltige Zahl: muss ein Vielfaches von ${Y.divisor} sein`;
      case "unrecognized_keys":
        return `${Y.keys.length > 1 ? "Unbekannte Schl\xFCssel" : "Unbekannter Schl\xFCssel"}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `Ung\xFCltiger Schl\xFCssel in ${Y.origin}`;
      case "invalid_union":
        return "Ung\xFCltige Eingabe";
      case "invalid_element":
        return `Ung\xFCltiger Wert in ${Y.origin}`;
      default:
        return "Ung\xFCltige Eingabe";
    }
  };
};
function cz() {
  return { localeError: yI() };
}
var fI = ($) => {
  let X = typeof $;
  switch (X) {
    case "number":
      return Number.isNaN($) ? "NaN" : "number";
    case "object": {
      if (Array.isArray($)) return "array";
      if ($ === null) return "null";
      if (Object.getPrototypeOf($) !== Object.prototype && $.constructor) return $.constructor.name;
    }
  }
  return X;
};
var gI = () => {
  let $ = { string: { unit: "characters", verb: "to have" }, file: { unit: "bytes", verb: "to have" }, array: { unit: "items", verb: "to have" }, set: { unit: "items", verb: "to have" } };
  function X(Q) {
    return $[Q] ?? null;
  }
  let J = { regex: "input", email: "email address", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO datetime", date: "ISO date", time: "ISO time", duration: "ISO duration", ipv4: "IPv4 address", ipv6: "IPv6 address", cidrv4: "IPv4 range", cidrv6: "IPv6 range", base64: "base64-encoded string", base64url: "base64url-encoded string", json_string: "JSON string", e164: "E.164 number", jwt: "JWT", template_literal: "input" };
  return (Q) => {
    switch (Q.code) {
      case "invalid_type":
        return `Invalid input: expected ${Q.expected}, received ${fI(Q.input)}`;
      case "invalid_value":
        if (Q.values.length === 1) return `Invalid input: expected ${S(Q.values[0])}`;
        return `Invalid option: expected one of ${M(Q.values, "|")}`;
      case "too_big": {
        let Y = Q.inclusive ? "<=" : "<", W = X(Q.origin);
        if (W) return `Too big: expected ${Q.origin ?? "value"} to have ${Y}${Q.maximum.toString()} ${W.unit ?? "elements"}`;
        return `Too big: expected ${Q.origin ?? "value"} to be ${Y}${Q.maximum.toString()}`;
      }
      case "too_small": {
        let Y = Q.inclusive ? ">=" : ">", W = X(Q.origin);
        if (W) return `Too small: expected ${Q.origin} to have ${Y}${Q.minimum.toString()} ${W.unit}`;
        return `Too small: expected ${Q.origin} to be ${Y}${Q.minimum.toString()}`;
      }
      case "invalid_format": {
        let Y = Q;
        if (Y.format === "starts_with") return `Invalid string: must start with "${Y.prefix}"`;
        if (Y.format === "ends_with") return `Invalid string: must end with "${Y.suffix}"`;
        if (Y.format === "includes") return `Invalid string: must include "${Y.includes}"`;
        if (Y.format === "regex") return `Invalid string: must match pattern ${Y.pattern}`;
        return `Invalid ${J[Y.format] ?? Q.format}`;
      }
      case "not_multiple_of":
        return `Invalid number: must be a multiple of ${Q.divisor}`;
      case "unrecognized_keys":
        return `Unrecognized key${Q.keys.length > 1 ? "s" : ""}: ${M(Q.keys, ", ")}`;
      case "invalid_key":
        return `Invalid key in ${Q.origin}`;
      case "invalid_union":
        return "Invalid input";
      case "invalid_element":
        return `Invalid value in ${Q.origin}`;
      default:
        return "Invalid input";
    }
  };
};
function yX() {
  return { localeError: gI() };
}
var hI = ($) => {
  let X = typeof $;
  switch (X) {
    case "number":
      return Number.isNaN($) ? "NaN" : "nombro";
    case "object": {
      if (Array.isArray($)) return "tabelo";
      if ($ === null) return "senvalora";
      if (Object.getPrototypeOf($) !== Object.prototype && $.constructor) return $.constructor.name;
    }
  }
  return X;
};
var uI = () => {
  let $ = { string: { unit: "karaktrojn", verb: "havi" }, file: { unit: "bajtojn", verb: "havi" }, array: { unit: "elementojn", verb: "havi" }, set: { unit: "elementojn", verb: "havi" } };
  function X(Q) {
    return $[Q] ?? null;
  }
  let J = { regex: "enigo", email: "retadreso", url: "URL", emoji: "emo\u011Dio", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO-datotempo", date: "ISO-dato", time: "ISO-tempo", duration: "ISO-da\u016Dro", ipv4: "IPv4-adreso", ipv6: "IPv6-adreso", cidrv4: "IPv4-rango", cidrv6: "IPv6-rango", base64: "64-ume kodita karaktraro", base64url: "URL-64-ume kodita karaktraro", json_string: "JSON-karaktraro", e164: "E.164-nombro", jwt: "JWT", template_literal: "enigo" };
  return (Q) => {
    switch (Q.code) {
      case "invalid_type":
        return `Nevalida enigo: atendi\u011Dis ${Q.expected}, ricevi\u011Dis ${hI(Q.input)}`;
      case "invalid_value":
        if (Q.values.length === 1) return `Nevalida enigo: atendi\u011Dis ${S(Q.values[0])}`;
        return `Nevalida opcio: atendi\u011Dis unu el ${M(Q.values, "|")}`;
      case "too_big": {
        let Y = Q.inclusive ? "<=" : "<", W = X(Q.origin);
        if (W) return `Tro granda: atendi\u011Dis ke ${Q.origin ?? "valoro"} havu ${Y}${Q.maximum.toString()} ${W.unit ?? "elementojn"}`;
        return `Tro granda: atendi\u011Dis ke ${Q.origin ?? "valoro"} havu ${Y}${Q.maximum.toString()}`;
      }
      case "too_small": {
        let Y = Q.inclusive ? ">=" : ">", W = X(Q.origin);
        if (W) return `Tro malgranda: atendi\u011Dis ke ${Q.origin} havu ${Y}${Q.minimum.toString()} ${W.unit}`;
        return `Tro malgranda: atendi\u011Dis ke ${Q.origin} estu ${Y}${Q.minimum.toString()}`;
      }
      case "invalid_format": {
        let Y = Q;
        if (Y.format === "starts_with") return `Nevalida karaktraro: devas komenci\u011Di per "${Y.prefix}"`;
        if (Y.format === "ends_with") return `Nevalida karaktraro: devas fini\u011Di per "${Y.suffix}"`;
        if (Y.format === "includes") return `Nevalida karaktraro: devas inkluzivi "${Y.includes}"`;
        if (Y.format === "regex") return `Nevalida karaktraro: devas kongrui kun la modelo ${Y.pattern}`;
        return `Nevalida ${J[Y.format] ?? Q.format}`;
      }
      case "not_multiple_of":
        return `Nevalida nombro: devas esti oblo de ${Q.divisor}`;
      case "unrecognized_keys":
        return `Nekonata${Q.keys.length > 1 ? "j" : ""} \u015Dlosilo${Q.keys.length > 1 ? "j" : ""}: ${M(Q.keys, ", ")}`;
      case "invalid_key":
        return `Nevalida \u015Dlosilo en ${Q.origin}`;
      case "invalid_union":
        return "Nevalida enigo";
      case "invalid_element":
        return `Nevalida valoro en ${Q.origin}`;
      default:
        return "Nevalida enigo";
    }
  };
};
function pz() {
  return { localeError: uI() };
}
var mI = () => {
  let $ = { string: { unit: "caracteres", verb: "tener" }, file: { unit: "bytes", verb: "tener" }, array: { unit: "elementos", verb: "tener" }, set: { unit: "elementos", verb: "tener" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "n\xFAmero";
      case "object": {
        if (Array.isArray(Y)) return "arreglo";
        if (Y === null) return "nulo";
        if (Object.getPrototypeOf(Y) !== Object.prototype) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "entrada", email: "direcci\xF3n de correo electr\xF3nico", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "fecha y hora ISO", date: "fecha ISO", time: "hora ISO", duration: "duraci\xF3n ISO", ipv4: "direcci\xF3n IPv4", ipv6: "direcci\xF3n IPv6", cidrv4: "rango IPv4", cidrv6: "rango IPv6", base64: "cadena codificada en base64", base64url: "URL codificada en base64", json_string: "cadena JSON", e164: "n\xFAmero E.164", jwt: "JWT", template_literal: "entrada" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `Entrada inv\xE1lida: se esperaba ${Y.expected}, recibido ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `Entrada inv\xE1lida: se esperaba ${S(Y.values[0])}`;
        return `Opci\xF3n inv\xE1lida: se esperaba una de ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `Demasiado grande: se esperaba que ${Y.origin ?? "valor"} tuviera ${W}${Y.maximum.toString()} ${z.unit ?? "elementos"}`;
        return `Demasiado grande: se esperaba que ${Y.origin ?? "valor"} fuera ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `Demasiado peque\xF1o: se esperaba que ${Y.origin} tuviera ${W}${Y.minimum.toString()} ${z.unit}`;
        return `Demasiado peque\xF1o: se esperaba que ${Y.origin} fuera ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `Cadena inv\xE1lida: debe comenzar con "${W.prefix}"`;
        if (W.format === "ends_with") return `Cadena inv\xE1lida: debe terminar en "${W.suffix}"`;
        if (W.format === "includes") return `Cadena inv\xE1lida: debe incluir "${W.includes}"`;
        if (W.format === "regex") return `Cadena inv\xE1lida: debe coincidir con el patr\xF3n ${W.pattern}`;
        return `Inv\xE1lido ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `N\xFAmero inv\xE1lido: debe ser m\xFAltiplo de ${Y.divisor}`;
      case "unrecognized_keys":
        return `Llave${Y.keys.length > 1 ? "s" : ""} desconocida${Y.keys.length > 1 ? "s" : ""}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `Llave inv\xE1lida en ${Y.origin}`;
      case "invalid_union":
        return "Entrada inv\xE1lida";
      case "invalid_element":
        return `Valor inv\xE1lido en ${Y.origin}`;
      default:
        return "Entrada inv\xE1lida";
    }
  };
};
function dz() {
  return { localeError: mI() };
}
var lI = () => {
  let $ = { string: { unit: "\u06A9\u0627\u0631\u0627\u06A9\u062A\u0631", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" }, file: { unit: "\u0628\u0627\u06CC\u062A", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" }, array: { unit: "\u0622\u06CC\u062A\u0645", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" }, set: { unit: "\u0622\u06CC\u062A\u0645", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "\u0639\u062F\u062F";
      case "object": {
        if (Array.isArray(Y)) return "\u0622\u0631\u0627\u06CC\u0647";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "\u0648\u0631\u0648\u062F\u06CC", email: "\u0622\u062F\u0631\u0633 \u0627\u06CC\u0645\u06CC\u0644", url: "URL", emoji: "\u0627\u06CC\u0645\u0648\u062C\u06CC", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "\u062A\u0627\u0631\u06CC\u062E \u0648 \u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648", date: "\u062A\u0627\u0631\u06CC\u062E \u0627\u06CC\u0632\u0648", time: "\u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648", duration: "\u0645\u062F\u062A \u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648", ipv4: "IPv4 \u0622\u062F\u0631\u0633", ipv6: "IPv6 \u0622\u062F\u0631\u0633", cidrv4: "IPv4 \u062F\u0627\u0645\u0646\u0647", cidrv6: "IPv6 \u062F\u0627\u0645\u0646\u0647", base64: "base64-encoded \u0631\u0634\u062A\u0647", base64url: "base64url-encoded \u0631\u0634\u062A\u0647", json_string: "JSON \u0631\u0634\u062A\u0647", e164: "E.164 \u0639\u062F\u062F", jwt: "JWT", template_literal: "\u0648\u0631\u0648\u062F\u06CC" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A ${Y.expected} \u0645\u06CC\u200C\u0628\u0648\u062F\u060C ${J(Y.input)} \u062F\u0631\u06CC\u0627\u0641\u062A \u0634\u062F`;
      case "invalid_value":
        if (Y.values.length === 1) return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A ${S(Y.values[0])} \u0645\u06CC\u200C\u0628\u0648\u062F`;
        return `\u06AF\u0632\u06CC\u0646\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A \u06CC\u06A9\u06CC \u0627\u0632 ${M(Y.values, "|")} \u0645\u06CC\u200C\u0628\u0648\u062F`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `\u062E\u06CC\u0644\u06CC \u0628\u0632\u0631\u06AF: ${Y.origin ?? "\u0645\u0642\u062F\u0627\u0631"} \u0628\u0627\u06CC\u062F ${W}${Y.maximum.toString()} ${z.unit ?? "\u0639\u0646\u0635\u0631"} \u0628\u0627\u0634\u062F`;
        return `\u062E\u06CC\u0644\u06CC \u0628\u0632\u0631\u06AF: ${Y.origin ?? "\u0645\u0642\u062F\u0627\u0631"} \u0628\u0627\u06CC\u062F ${W}${Y.maximum.toString()} \u0628\u0627\u0634\u062F`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `\u062E\u06CC\u0644\u06CC \u06A9\u0648\u0686\u06A9: ${Y.origin} \u0628\u0627\u06CC\u062F ${W}${Y.minimum.toString()} ${z.unit} \u0628\u0627\u0634\u062F`;
        return `\u062E\u06CC\u0644\u06CC \u06A9\u0648\u0686\u06A9: ${Y.origin} \u0628\u0627\u06CC\u062F ${W}${Y.minimum.toString()} \u0628\u0627\u0634\u062F`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 "${W.prefix}" \u0634\u0631\u0648\u0639 \u0634\u0648\u062F`;
        if (W.format === "ends_with") return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 "${W.suffix}" \u062A\u0645\u0627\u0645 \u0634\u0648\u062F`;
        if (W.format === "includes") return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0634\u0627\u0645\u0644 "${W.includes}" \u0628\u0627\u0634\u062F`;
        if (W.format === "regex") return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 \u0627\u0644\u06AF\u0648\u06CC ${W.pattern} \u0645\u0637\u0627\u0628\u0642\u062A \u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F`;
        return `${Q[W.format] ?? Y.format} \u0646\u0627\u0645\u0639\u062A\u0628\u0631`;
      }
      case "not_multiple_of":
        return `\u0639\u062F\u062F \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0645\u0636\u0631\u0628 ${Y.divisor} \u0628\u0627\u0634\u062F`;
      case "unrecognized_keys":
        return `\u06A9\u0644\u06CC\u062F${Y.keys.length > 1 ? "\u0647\u0627\u06CC" : ""} \u0646\u0627\u0634\u0646\u0627\u0633: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `\u06A9\u0644\u06CC\u062F \u0646\u0627\u0634\u0646\u0627\u0633 \u062F\u0631 ${Y.origin}`;
      case "invalid_union":
        return "\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631";
      case "invalid_element":
        return `\u0645\u0642\u062F\u0627\u0631 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u062F\u0631 ${Y.origin}`;
      default:
        return "\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631";
    }
  };
};
function iz() {
  return { localeError: lI() };
}
var cI = () => {
  let $ = { string: { unit: "merkki\xE4", subject: "merkkijonon" }, file: { unit: "tavua", subject: "tiedoston" }, array: { unit: "alkiota", subject: "listan" }, set: { unit: "alkiota", subject: "joukon" }, number: { unit: "", subject: "luvun" }, bigint: { unit: "", subject: "suuren kokonaisluvun" }, int: { unit: "", subject: "kokonaisluvun" }, date: { unit: "", subject: "p\xE4iv\xE4m\xE4\xE4r\xE4n" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "number";
      case "object": {
        if (Array.isArray(Y)) return "array";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "s\xE4\xE4nn\xF6llinen lauseke", email: "s\xE4hk\xF6postiosoite", url: "URL-osoite", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO-aikaleima", date: "ISO-p\xE4iv\xE4m\xE4\xE4r\xE4", time: "ISO-aika", duration: "ISO-kesto", ipv4: "IPv4-osoite", ipv6: "IPv6-osoite", cidrv4: "IPv4-alue", cidrv6: "IPv6-alue", base64: "base64-koodattu merkkijono", base64url: "base64url-koodattu merkkijono", json_string: "JSON-merkkijono", e164: "E.164-luku", jwt: "JWT", template_literal: "templaattimerkkijono" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `Virheellinen tyyppi: odotettiin ${Y.expected}, oli ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `Virheellinen sy\xF6te: t\xE4ytyy olla ${S(Y.values[0])}`;
        return `Virheellinen valinta: t\xE4ytyy olla yksi seuraavista: ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `Liian suuri: ${z.subject} t\xE4ytyy olla ${W}${Y.maximum.toString()} ${z.unit}`.trim();
        return `Liian suuri: arvon t\xE4ytyy olla ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `Liian pieni: ${z.subject} t\xE4ytyy olla ${W}${Y.minimum.toString()} ${z.unit}`.trim();
        return `Liian pieni: arvon t\xE4ytyy olla ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `Virheellinen sy\xF6te: t\xE4ytyy alkaa "${W.prefix}"`;
        if (W.format === "ends_with") return `Virheellinen sy\xF6te: t\xE4ytyy loppua "${W.suffix}"`;
        if (W.format === "includes") return `Virheellinen sy\xF6te: t\xE4ytyy sis\xE4lt\xE4\xE4 "${W.includes}"`;
        if (W.format === "regex") return `Virheellinen sy\xF6te: t\xE4ytyy vastata s\xE4\xE4nn\xF6llist\xE4 lauseketta ${W.pattern}`;
        return `Virheellinen ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `Virheellinen luku: t\xE4ytyy olla luvun ${Y.divisor} monikerta`;
      case "unrecognized_keys":
        return `${Y.keys.length > 1 ? "Tuntemattomat avaimet" : "Tuntematon avain"}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return "Virheellinen avain tietueessa";
      case "invalid_union":
        return "Virheellinen unioni";
      case "invalid_element":
        return "Virheellinen arvo joukossa";
      default:
        return "Virheellinen sy\xF6te";
    }
  };
};
function nz() {
  return { localeError: cI() };
}
var pI = () => {
  let $ = { string: { unit: "caract\xE8res", verb: "avoir" }, file: { unit: "octets", verb: "avoir" }, array: { unit: "\xE9l\xE9ments", verb: "avoir" }, set: { unit: "\xE9l\xE9ments", verb: "avoir" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "nombre";
      case "object": {
        if (Array.isArray(Y)) return "tableau";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "entr\xE9e", email: "adresse e-mail", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "date et heure ISO", date: "date ISO", time: "heure ISO", duration: "dur\xE9e ISO", ipv4: "adresse IPv4", ipv6: "adresse IPv6", cidrv4: "plage IPv4", cidrv6: "plage IPv6", base64: "cha\xEEne encod\xE9e en base64", base64url: "cha\xEEne encod\xE9e en base64url", json_string: "cha\xEEne JSON", e164: "num\xE9ro E.164", jwt: "JWT", template_literal: "entr\xE9e" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `Entr\xE9e invalide : ${Y.expected} attendu, ${J(Y.input)} re\xE7u`;
      case "invalid_value":
        if (Y.values.length === 1) return `Entr\xE9e invalide : ${S(Y.values[0])} attendu`;
        return `Option invalide : une valeur parmi ${M(Y.values, "|")} attendue`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `Trop grand : ${Y.origin ?? "valeur"} doit ${z.verb} ${W}${Y.maximum.toString()} ${z.unit ?? "\xE9l\xE9ment(s)"}`;
        return `Trop grand : ${Y.origin ?? "valeur"} doit \xEAtre ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `Trop petit : ${Y.origin} doit ${z.verb} ${W}${Y.minimum.toString()} ${z.unit}`;
        return `Trop petit : ${Y.origin} doit \xEAtre ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `Cha\xEEne invalide : doit commencer par "${W.prefix}"`;
        if (W.format === "ends_with") return `Cha\xEEne invalide : doit se terminer par "${W.suffix}"`;
        if (W.format === "includes") return `Cha\xEEne invalide : doit inclure "${W.includes}"`;
        if (W.format === "regex") return `Cha\xEEne invalide : doit correspondre au mod\xE8le ${W.pattern}`;
        return `${Q[W.format] ?? Y.format} invalide`;
      }
      case "not_multiple_of":
        return `Nombre invalide : doit \xEAtre un multiple de ${Y.divisor}`;
      case "unrecognized_keys":
        return `Cl\xE9${Y.keys.length > 1 ? "s" : ""} non reconnue${Y.keys.length > 1 ? "s" : ""} : ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `Cl\xE9 invalide dans ${Y.origin}`;
      case "invalid_union":
        return "Entr\xE9e invalide";
      case "invalid_element":
        return `Valeur invalide dans ${Y.origin}`;
      default:
        return "Entr\xE9e invalide";
    }
  };
};
function rz() {
  return { localeError: pI() };
}
var dI = () => {
  let $ = { string: { unit: "caract\xE8res", verb: "avoir" }, file: { unit: "octets", verb: "avoir" }, array: { unit: "\xE9l\xE9ments", verb: "avoir" }, set: { unit: "\xE9l\xE9ments", verb: "avoir" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "number";
      case "object": {
        if (Array.isArray(Y)) return "array";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "entr\xE9e", email: "adresse courriel", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "date-heure ISO", date: "date ISO", time: "heure ISO", duration: "dur\xE9e ISO", ipv4: "adresse IPv4", ipv6: "adresse IPv6", cidrv4: "plage IPv4", cidrv6: "plage IPv6", base64: "cha\xEEne encod\xE9e en base64", base64url: "cha\xEEne encod\xE9e en base64url", json_string: "cha\xEEne JSON", e164: "num\xE9ro E.164", jwt: "JWT", template_literal: "entr\xE9e" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `Entr\xE9e invalide : attendu ${Y.expected}, re\xE7u ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `Entr\xE9e invalide : attendu ${S(Y.values[0])}`;
        return `Option invalide : attendu l'une des valeurs suivantes ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "\u2264" : "<", z = X(Y.origin);
        if (z) return `Trop grand : attendu que ${Y.origin ?? "la valeur"} ait ${W}${Y.maximum.toString()} ${z.unit}`;
        return `Trop grand : attendu que ${Y.origin ?? "la valeur"} soit ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? "\u2265" : ">", z = X(Y.origin);
        if (z) return `Trop petit : attendu que ${Y.origin} ait ${W}${Y.minimum.toString()} ${z.unit}`;
        return `Trop petit : attendu que ${Y.origin} soit ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `Cha\xEEne invalide : doit commencer par "${W.prefix}"`;
        if (W.format === "ends_with") return `Cha\xEEne invalide : doit se terminer par "${W.suffix}"`;
        if (W.format === "includes") return `Cha\xEEne invalide : doit inclure "${W.includes}"`;
        if (W.format === "regex") return `Cha\xEEne invalide : doit correspondre au motif ${W.pattern}`;
        return `${Q[W.format] ?? Y.format} invalide`;
      }
      case "not_multiple_of":
        return `Nombre invalide : doit \xEAtre un multiple de ${Y.divisor}`;
      case "unrecognized_keys":
        return `Cl\xE9${Y.keys.length > 1 ? "s" : ""} non reconnue${Y.keys.length > 1 ? "s" : ""} : ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `Cl\xE9 invalide dans ${Y.origin}`;
      case "invalid_union":
        return "Entr\xE9e invalide";
      case "invalid_element":
        return `Valeur invalide dans ${Y.origin}`;
      default:
        return "Entr\xE9e invalide";
    }
  };
};
function oz() {
  return { localeError: dI() };
}
var iI = () => {
  let $ = { string: { unit: "\u05D0\u05D5\u05EA\u05D9\u05D5\u05EA", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" }, file: { unit: "\u05D1\u05D9\u05D9\u05D8\u05D9\u05DD", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" }, array: { unit: "\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" }, set: { unit: "\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "number";
      case "object": {
        if (Array.isArray(Y)) return "array";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "\u05E7\u05DC\u05D8", email: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC", url: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05E8\u05E9\u05EA", emoji: "\u05D0\u05D9\u05DE\u05D5\u05D2'\u05D9", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "\u05EA\u05D0\u05E8\u05D9\u05DA \u05D5\u05D6\u05DE\u05DF ISO", date: "\u05EA\u05D0\u05E8\u05D9\u05DA ISO", time: "\u05D6\u05DE\u05DF ISO", duration: "\u05DE\u05E9\u05DA \u05D6\u05DE\u05DF ISO", ipv4: "\u05DB\u05EA\u05D5\u05D1\u05EA IPv4", ipv6: "\u05DB\u05EA\u05D5\u05D1\u05EA IPv6", cidrv4: "\u05D8\u05D5\u05D5\u05D7 IPv4", cidrv6: "\u05D8\u05D5\u05D5\u05D7 IPv6", base64: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D1\u05D1\u05E1\u05D9\u05E1 64", base64url: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D1\u05D1\u05E1\u05D9\u05E1 64 \u05DC\u05DB\u05EA\u05D5\u05D1\u05D5\u05EA \u05E8\u05E9\u05EA", json_string: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA JSON", e164: "\u05DE\u05E1\u05E4\u05E8 E.164", jwt: "JWT", template_literal: "\u05E7\u05DC\u05D8" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA ${Y.expected}, \u05D4\u05EA\u05E7\u05D1\u05DC ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA ${S(Y.values[0])}`;
        return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA \u05D0\u05D7\u05EA \u05DE\u05D4\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA  ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `\u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9: ${Y.origin ?? "value"} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${W}${Y.maximum.toString()} ${z.unit ?? "elements"}`;
        return `\u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9: ${Y.origin ?? "value"} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${Y.origin} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${W}${Y.minimum.toString()} ${z.unit}`;
        return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${Y.origin} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC \u05D1"${W.prefix}"`;
        if (W.format === "ends_with") return `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05E1\u05EA\u05D9\u05D9\u05DD \u05D1 "${W.suffix}"`;
        if (W.format === "includes") return `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05DB\u05DC\u05D5\u05DC "${W.includes}"`;
        if (W.format === "regex") return `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D0\u05D9\u05DD \u05DC\u05EA\u05D1\u05E0\u05D9\u05EA ${W.pattern}`;
        return `${Q[W.format] ?? Y.format} \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF`;
      }
      case "not_multiple_of":
        return `\u05DE\u05E1\u05E4\u05E8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05DB\u05E4\u05DC\u05D4 \u05E9\u05DC ${Y.divisor}`;
      case "unrecognized_keys":
        return `\u05DE\u05E4\u05EA\u05D7${Y.keys.length > 1 ? "\u05D5\u05EA" : ""} \u05DC\u05D0 \u05DE\u05D6\u05D5\u05D4${Y.keys.length > 1 ? "\u05D9\u05DD" : "\u05D4"}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `\u05DE\u05E4\u05EA\u05D7 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D1${Y.origin}`;
      case "invalid_union":
        return "\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF";
      case "invalid_element":
        return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D1${Y.origin}`;
      default:
        return "\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF";
    }
  };
};
function tz() {
  return { localeError: iI() };
}
var nI = () => {
  let $ = { string: { unit: "karakter", verb: "legyen" }, file: { unit: "byte", verb: "legyen" }, array: { unit: "elem", verb: "legyen" }, set: { unit: "elem", verb: "legyen" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "sz\xE1m";
      case "object": {
        if (Array.isArray(Y)) return "t\xF6mb";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "bemenet", email: "email c\xEDm", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO id\u0151b\xE9lyeg", date: "ISO d\xE1tum", time: "ISO id\u0151", duration: "ISO id\u0151intervallum", ipv4: "IPv4 c\xEDm", ipv6: "IPv6 c\xEDm", cidrv4: "IPv4 tartom\xE1ny", cidrv6: "IPv6 tartom\xE1ny", base64: "base64-k\xF3dolt string", base64url: "base64url-k\xF3dolt string", json_string: "JSON string", e164: "E.164 sz\xE1m", jwt: "JWT", template_literal: "bemenet" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k ${Y.expected}, a kapott \xE9rt\xE9k ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k ${S(Y.values[0])}`;
        return `\xC9rv\xE9nytelen opci\xF3: valamelyik \xE9rt\xE9k v\xE1rt ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `T\xFAl nagy: ${Y.origin ?? "\xE9rt\xE9k"} m\xE9rete t\xFAl nagy ${W}${Y.maximum.toString()} ${z.unit ?? "elem"}`;
        return `T\xFAl nagy: a bemeneti \xE9rt\xE9k ${Y.origin ?? "\xE9rt\xE9k"} t\xFAl nagy: ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `T\xFAl kicsi: a bemeneti \xE9rt\xE9k ${Y.origin} m\xE9rete t\xFAl kicsi ${W}${Y.minimum.toString()} ${z.unit}`;
        return `T\xFAl kicsi: a bemeneti \xE9rt\xE9k ${Y.origin} t\xFAl kicsi ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `\xC9rv\xE9nytelen string: "${W.prefix}" \xE9rt\xE9kkel kell kezd\u0151dnie`;
        if (W.format === "ends_with") return `\xC9rv\xE9nytelen string: "${W.suffix}" \xE9rt\xE9kkel kell v\xE9gz\u0151dnie`;
        if (W.format === "includes") return `\xC9rv\xE9nytelen string: "${W.includes}" \xE9rt\xE9ket kell tartalmaznia`;
        if (W.format === "regex") return `\xC9rv\xE9nytelen string: ${W.pattern} mint\xE1nak kell megfelelnie`;
        return `\xC9rv\xE9nytelen ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `\xC9rv\xE9nytelen sz\xE1m: ${Y.divisor} t\xF6bbsz\xF6r\xF6s\xE9nek kell lennie`;
      case "unrecognized_keys":
        return `Ismeretlen kulcs${Y.keys.length > 1 ? "s" : ""}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `\xC9rv\xE9nytelen kulcs ${Y.origin}`;
      case "invalid_union":
        return "\xC9rv\xE9nytelen bemenet";
      case "invalid_element":
        return `\xC9rv\xE9nytelen \xE9rt\xE9k: ${Y.origin}`;
      default:
        return "\xC9rv\xE9nytelen bemenet";
    }
  };
};
function az() {
  return { localeError: nI() };
}
var rI = () => {
  let $ = { string: { unit: "karakter", verb: "memiliki" }, file: { unit: "byte", verb: "memiliki" }, array: { unit: "item", verb: "memiliki" }, set: { unit: "item", verb: "memiliki" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "number";
      case "object": {
        if (Array.isArray(Y)) return "array";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "input", email: "alamat email", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "tanggal dan waktu format ISO", date: "tanggal format ISO", time: "jam format ISO", duration: "durasi format ISO", ipv4: "alamat IPv4", ipv6: "alamat IPv6", cidrv4: "rentang alamat IPv4", cidrv6: "rentang alamat IPv6", base64: "string dengan enkode base64", base64url: "string dengan enkode base64url", json_string: "string JSON", e164: "angka E.164", jwt: "JWT", template_literal: "input" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `Input tidak valid: diharapkan ${Y.expected}, diterima ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `Input tidak valid: diharapkan ${S(Y.values[0])}`;
        return `Pilihan tidak valid: diharapkan salah satu dari ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `Terlalu besar: diharapkan ${Y.origin ?? "value"} memiliki ${W}${Y.maximum.toString()} ${z.unit ?? "elemen"}`;
        return `Terlalu besar: diharapkan ${Y.origin ?? "value"} menjadi ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `Terlalu kecil: diharapkan ${Y.origin} memiliki ${W}${Y.minimum.toString()} ${z.unit}`;
        return `Terlalu kecil: diharapkan ${Y.origin} menjadi ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `String tidak valid: harus dimulai dengan "${W.prefix}"`;
        if (W.format === "ends_with") return `String tidak valid: harus berakhir dengan "${W.suffix}"`;
        if (W.format === "includes") return `String tidak valid: harus menyertakan "${W.includes}"`;
        if (W.format === "regex") return `String tidak valid: harus sesuai pola ${W.pattern}`;
        return `${Q[W.format] ?? Y.format} tidak valid`;
      }
      case "not_multiple_of":
        return `Angka tidak valid: harus kelipatan dari ${Y.divisor}`;
      case "unrecognized_keys":
        return `Kunci tidak dikenali ${Y.keys.length > 1 ? "s" : ""}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `Kunci tidak valid di ${Y.origin}`;
      case "invalid_union":
        return "Input tidak valid";
      case "invalid_element":
        return `Nilai tidak valid di ${Y.origin}`;
      default:
        return "Input tidak valid";
    }
  };
};
function sz() {
  return { localeError: rI() };
}
var oI = () => {
  let $ = { string: { unit: "caratteri", verb: "avere" }, file: { unit: "byte", verb: "avere" }, array: { unit: "elementi", verb: "avere" }, set: { unit: "elementi", verb: "avere" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "numero";
      case "object": {
        if (Array.isArray(Y)) return "vettore";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "input", email: "indirizzo email", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "data e ora ISO", date: "data ISO", time: "ora ISO", duration: "durata ISO", ipv4: "indirizzo IPv4", ipv6: "indirizzo IPv6", cidrv4: "intervallo IPv4", cidrv6: "intervallo IPv6", base64: "stringa codificata in base64", base64url: "URL codificata in base64", json_string: "stringa JSON", e164: "numero E.164", jwt: "JWT", template_literal: "input" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `Input non valido: atteso ${Y.expected}, ricevuto ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `Input non valido: atteso ${S(Y.values[0])}`;
        return `Opzione non valida: atteso uno tra ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `Troppo grande: ${Y.origin ?? "valore"} deve avere ${W}${Y.maximum.toString()} ${z.unit ?? "elementi"}`;
        return `Troppo grande: ${Y.origin ?? "valore"} deve essere ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `Troppo piccolo: ${Y.origin} deve avere ${W}${Y.minimum.toString()} ${z.unit}`;
        return `Troppo piccolo: ${Y.origin} deve essere ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `Stringa non valida: deve iniziare con "${W.prefix}"`;
        if (W.format === "ends_with") return `Stringa non valida: deve terminare con "${W.suffix}"`;
        if (W.format === "includes") return `Stringa non valida: deve includere "${W.includes}"`;
        if (W.format === "regex") return `Stringa non valida: deve corrispondere al pattern ${W.pattern}`;
        return `Invalid ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `Numero non valido: deve essere un multiplo di ${Y.divisor}`;
      case "unrecognized_keys":
        return `Chiav${Y.keys.length > 1 ? "i" : "e"} non riconosciut${Y.keys.length > 1 ? "e" : "a"}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `Chiave non valida in ${Y.origin}`;
      case "invalid_union":
        return "Input non valido";
      case "invalid_element":
        return `Valore non valido in ${Y.origin}`;
      default:
        return "Input non valido";
    }
  };
};
function ez() {
  return { localeError: oI() };
}
var tI = () => {
  let $ = { string: { unit: "\u6587\u5B57", verb: "\u3067\u3042\u308B" }, file: { unit: "\u30D0\u30A4\u30C8", verb: "\u3067\u3042\u308B" }, array: { unit: "\u8981\u7D20", verb: "\u3067\u3042\u308B" }, set: { unit: "\u8981\u7D20", verb: "\u3067\u3042\u308B" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "\u6570\u5024";
      case "object": {
        if (Array.isArray(Y)) return "\u914D\u5217";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "\u5165\u529B\u5024", email: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9", url: "URL", emoji: "\u7D75\u6587\u5B57", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO\u65E5\u6642", date: "ISO\u65E5\u4ED8", time: "ISO\u6642\u523B", duration: "ISO\u671F\u9593", ipv4: "IPv4\u30A2\u30C9\u30EC\u30B9", ipv6: "IPv6\u30A2\u30C9\u30EC\u30B9", cidrv4: "IPv4\u7BC4\u56F2", cidrv6: "IPv6\u7BC4\u56F2", base64: "base64\u30A8\u30F3\u30B3\u30FC\u30C9\u6587\u5B57\u5217", base64url: "base64url\u30A8\u30F3\u30B3\u30FC\u30C9\u6587\u5B57\u5217", json_string: "JSON\u6587\u5B57\u5217", e164: "E.164\u756A\u53F7", jwt: "JWT", template_literal: "\u5165\u529B\u5024" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `\u7121\u52B9\u306A\u5165\u529B: ${Y.expected}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F\u304C\u3001${J(Y.input)}\u304C\u5165\u529B\u3055\u308C\u307E\u3057\u305F`;
      case "invalid_value":
        if (Y.values.length === 1) return `\u7121\u52B9\u306A\u5165\u529B: ${S(Y.values[0])}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F`;
        return `\u7121\u52B9\u306A\u9078\u629E: ${M(Y.values, "\u3001")}\u306E\u3044\u305A\u308C\u304B\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
      case "too_big": {
        let W = Y.inclusive ? "\u4EE5\u4E0B\u3067\u3042\u308B" : "\u3088\u308A\u5C0F\u3055\u3044", z = X(Y.origin);
        if (z) return `\u5927\u304D\u3059\u304E\u308B\u5024: ${Y.origin ?? "\u5024"}\u306F${Y.maximum.toString()}${z.unit ?? "\u8981\u7D20"}${W}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        return `\u5927\u304D\u3059\u304E\u308B\u5024: ${Y.origin ?? "\u5024"}\u306F${Y.maximum.toString()}${W}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
      }
      case "too_small": {
        let W = Y.inclusive ? "\u4EE5\u4E0A\u3067\u3042\u308B" : "\u3088\u308A\u5927\u304D\u3044", z = X(Y.origin);
        if (z) return `\u5C0F\u3055\u3059\u304E\u308B\u5024: ${Y.origin}\u306F${Y.minimum.toString()}${z.unit}${W}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        return `\u5C0F\u3055\u3059\u304E\u308B\u5024: ${Y.origin}\u306F${Y.minimum.toString()}${W}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${W.prefix}"\u3067\u59CB\u307E\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        if (W.format === "ends_with") return `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${W.suffix}"\u3067\u7D42\u308F\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        if (W.format === "includes") return `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${W.includes}"\u3092\u542B\u3080\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        if (W.format === "regex") return `\u7121\u52B9\u306A\u6587\u5B57\u5217: \u30D1\u30BF\u30FC\u30F3${W.pattern}\u306B\u4E00\u81F4\u3059\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        return `\u7121\u52B9\u306A${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `\u7121\u52B9\u306A\u6570\u5024: ${Y.divisor}\u306E\u500D\u6570\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
      case "unrecognized_keys":
        return `\u8A8D\u8B58\u3055\u308C\u3066\u3044\u306A\u3044\u30AD\u30FC${Y.keys.length > 1 ? "\u7FA4" : ""}: ${M(Y.keys, "\u3001")}`;
      case "invalid_key":
        return `${Y.origin}\u5185\u306E\u7121\u52B9\u306A\u30AD\u30FC`;
      case "invalid_union":
        return "\u7121\u52B9\u306A\u5165\u529B";
      case "invalid_element":
        return `${Y.origin}\u5185\u306E\u7121\u52B9\u306A\u5024`;
      default:
        return "\u7121\u52B9\u306A\u5165\u529B";
    }
  };
};
function $3() {
  return { localeError: tI() };
}
var aI = () => {
  let $ = { string: { unit: "\u178F\u17BD\u17A2\u1780\u17D2\u179F\u179A", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" }, file: { unit: "\u1794\u17C3", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" }, array: { unit: "\u1792\u17B6\u178F\u17BB", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" }, set: { unit: "\u1792\u17B6\u178F\u17BB", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "\u1798\u17B7\u1793\u1798\u17C2\u1793\u1787\u17B6\u179B\u17C1\u1781 (NaN)" : "\u179B\u17C1\u1781";
      case "object": {
        if (Array.isArray(Y)) return "\u17A2\u17B6\u179A\u17C1 (Array)";
        if (Y === null) return "\u1782\u17D2\u1798\u17B6\u1793\u178F\u1798\u17D2\u179B\u17C3 (null)";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B", email: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793\u17A2\u17CA\u17B8\u1798\u17C2\u179B", url: "URL", emoji: "\u179F\u1789\u17D2\u1789\u17B6\u17A2\u17B6\u179A\u1798\u17D2\u1798\u178E\u17CD", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "\u1780\u17B6\u179B\u1794\u179A\u17B7\u1785\u17D2\u1786\u17C1\u1791 \u1793\u17B7\u1784\u1798\u17C9\u17C4\u1784 ISO", date: "\u1780\u17B6\u179B\u1794\u179A\u17B7\u1785\u17D2\u1786\u17C1\u1791 ISO", time: "\u1798\u17C9\u17C4\u1784 ISO", duration: "\u179A\u1799\u17C8\u1796\u17C1\u179B ISO", ipv4: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv4", ipv6: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv6", cidrv4: "\u178A\u17C2\u1793\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv4", cidrv6: "\u178A\u17C2\u1793\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv6", base64: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u17A2\u17CA\u17B7\u1780\u17BC\u178A base64", base64url: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u17A2\u17CA\u17B7\u1780\u17BC\u178A base64url", json_string: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A JSON", e164: "\u179B\u17C1\u1781 E.164", jwt: "JWT", template_literal: "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${Y.expected} \u1794\u17C9\u17BB\u1793\u17D2\u178F\u17C2\u1791\u1791\u17BD\u179B\u1794\u17B6\u1793 ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${S(Y.values[0])}`;
        return `\u1787\u1798\u17D2\u179A\u17BE\u179F\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1787\u17B6\u1798\u17BD\u1799\u1780\u17D2\u1793\u17BB\u1784\u1785\u17C6\u178E\u17C4\u1798 ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `\u1792\u17C6\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${Y.origin ?? "\u178F\u1798\u17D2\u179B\u17C3"} ${W} ${Y.maximum.toString()} ${z.unit ?? "\u1792\u17B6\u178F\u17BB"}`;
        return `\u1792\u17C6\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${Y.origin ?? "\u178F\u1798\u17D2\u179B\u17C3"} ${W} ${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `\u178F\u17BC\u1785\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${Y.origin} ${W} ${Y.minimum.toString()} ${z.unit}`;
        return `\u178F\u17BC\u1785\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${Y.origin} ${W} ${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1785\u17B6\u1794\u17CB\u1795\u17D2\u178F\u17BE\u1798\u178A\u17C4\u1799 "${W.prefix}"`;
        if (W.format === "ends_with") return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1794\u1789\u17D2\u1785\u1794\u17CB\u178A\u17C4\u1799 "${W.suffix}"`;
        if (W.format === "includes") return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1798\u17B6\u1793 "${W.includes}"`;
        if (W.format === "regex") return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u178F\u17C2\u1795\u17D2\u1782\u17BC\u1795\u17D2\u1782\u1784\u1793\u17B9\u1784\u1791\u1798\u17D2\u179A\u1784\u17CB\u178A\u17C2\u179B\u1794\u17B6\u1793\u1780\u17C6\u178E\u178F\u17CB ${W.pattern}`;
        return `\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `\u179B\u17C1\u1781\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u178F\u17C2\u1787\u17B6\u1796\u17A0\u17BB\u1782\u17BB\u178E\u1793\u17C3 ${Y.divisor}`;
      case "unrecognized_keys":
        return `\u179A\u1780\u1783\u17BE\u1789\u179F\u17C4\u1798\u17B7\u1793\u179F\u17D2\u1782\u17B6\u179B\u17CB\u17D6 ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `\u179F\u17C4\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u1793\u17C5\u1780\u17D2\u1793\u17BB\u1784 ${Y.origin}`;
      case "invalid_union":
        return "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C";
      case "invalid_element":
        return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u1793\u17C5\u1780\u17D2\u1793\u17BB\u1784 ${Y.origin}`;
      default:
        return "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C";
    }
  };
};
function X3() {
  return { localeError: aI() };
}
var sI = () => {
  let $ = { string: { unit: "\uBB38\uC790", verb: "to have" }, file: { unit: "\uBC14\uC774\uD2B8", verb: "to have" }, array: { unit: "\uAC1C", verb: "to have" }, set: { unit: "\uAC1C", verb: "to have" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "number";
      case "object": {
        if (Array.isArray(Y)) return "array";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "\uC785\uB825", email: "\uC774\uBA54\uC77C \uC8FC\uC18C", url: "URL", emoji: "\uC774\uBAA8\uC9C0", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO \uB0A0\uC9DC\uC2DC\uAC04", date: "ISO \uB0A0\uC9DC", time: "ISO \uC2DC\uAC04", duration: "ISO \uAE30\uAC04", ipv4: "IPv4 \uC8FC\uC18C", ipv6: "IPv6 \uC8FC\uC18C", cidrv4: "IPv4 \uBC94\uC704", cidrv6: "IPv6 \uBC94\uC704", base64: "base64 \uC778\uCF54\uB529 \uBB38\uC790\uC5F4", base64url: "base64url \uC778\uCF54\uB529 \uBB38\uC790\uC5F4", json_string: "JSON \uBB38\uC790\uC5F4", e164: "E.164 \uBC88\uD638", jwt: "JWT", template_literal: "\uC785\uB825" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `\uC798\uBABB\uB41C \uC785\uB825: \uC608\uC0C1 \uD0C0\uC785\uC740 ${Y.expected}, \uBC1B\uC740 \uD0C0\uC785\uC740 ${J(Y.input)}\uC785\uB2C8\uB2E4`;
      case "invalid_value":
        if (Y.values.length === 1) return `\uC798\uBABB\uB41C \uC785\uB825: \uAC12\uC740 ${S(Y.values[0])} \uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4`;
        return `\uC798\uBABB\uB41C \uC635\uC158: ${M(Y.values, "\uB610\uB294 ")} \uC911 \uD558\uB098\uC5EC\uC57C \uD569\uB2C8\uB2E4`;
      case "too_big": {
        let W = Y.inclusive ? "\uC774\uD558" : "\uBBF8\uB9CC", z = W === "\uBBF8\uB9CC" ? "\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4" : "\uC5EC\uC57C \uD569\uB2C8\uB2E4", G = X(Y.origin), U = G?.unit ?? "\uC694\uC18C";
        if (G) return `${Y.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4: ${Y.maximum.toString()}${U} ${W}${z}`;
        return `${Y.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4: ${Y.maximum.toString()} ${W}${z}`;
      }
      case "too_small": {
        let W = Y.inclusive ? "\uC774\uC0C1" : "\uCD08\uACFC", z = W === "\uC774\uC0C1" ? "\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4" : "\uC5EC\uC57C \uD569\uB2C8\uB2E4", G = X(Y.origin), U = G?.unit ?? "\uC694\uC18C";
        if (G) return `${Y.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uC791\uC2B5\uB2C8\uB2E4: ${Y.minimum.toString()}${U} ${W}${z}`;
        return `${Y.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uC791\uC2B5\uB2C8\uB2E4: ${Y.minimum.toString()} ${W}${z}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${W.prefix}"(\uC73C)\uB85C \uC2DC\uC791\uD574\uC57C \uD569\uB2C8\uB2E4`;
        if (W.format === "ends_with") return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${W.suffix}"(\uC73C)\uB85C \uB05D\uB098\uC57C \uD569\uB2C8\uB2E4`;
        if (W.format === "includes") return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${W.includes}"\uC744(\uB97C) \uD3EC\uD568\uD574\uC57C \uD569\uB2C8\uB2E4`;
        if (W.format === "regex") return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: \uC815\uADDC\uC2DD ${W.pattern} \uD328\uD134\uACFC \uC77C\uCE58\uD574\uC57C \uD569\uB2C8\uB2E4`;
        return `\uC798\uBABB\uB41C ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `\uC798\uBABB\uB41C \uC22B\uC790: ${Y.divisor}\uC758 \uBC30\uC218\uC5EC\uC57C \uD569\uB2C8\uB2E4`;
      case "unrecognized_keys":
        return `\uC778\uC2DD\uD560 \uC218 \uC5C6\uB294 \uD0A4: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `\uC798\uBABB\uB41C \uD0A4: ${Y.origin}`;
      case "invalid_union":
        return "\uC798\uBABB\uB41C \uC785\uB825";
      case "invalid_element":
        return `\uC798\uBABB\uB41C \uAC12: ${Y.origin}`;
      default:
        return "\uC798\uBABB\uB41C \uC785\uB825";
    }
  };
};
function J3() {
  return { localeError: sI() };
}
var eI = () => {
  let $ = { string: { unit: "\u0437\u043D\u0430\u0446\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" }, file: { unit: "\u0431\u0430\u0458\u0442\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" }, array: { unit: "\u0441\u0442\u0430\u0432\u043A\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" }, set: { unit: "\u0441\u0442\u0430\u0432\u043A\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "\u0431\u0440\u043E\u0458";
      case "object": {
        if (Array.isArray(Y)) return "\u043D\u0438\u0437\u0430";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "\u0432\u043D\u0435\u0441", email: "\u0430\u0434\u0440\u0435\u0441\u0430 \u043D\u0430 \u0435-\u043F\u043E\u0448\u0442\u0430", url: "URL", emoji: "\u0435\u043C\u043E\u045F\u0438", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO \u0434\u0430\u0442\u0443\u043C \u0438 \u0432\u0440\u0435\u043C\u0435", date: "ISO \u0434\u0430\u0442\u0443\u043C", time: "ISO \u0432\u0440\u0435\u043C\u0435", duration: "ISO \u0432\u0440\u0435\u043C\u0435\u0442\u0440\u0430\u0435\u045A\u0435", ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441\u0430", ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441\u0430", cidrv4: "IPv4 \u043E\u043F\u0441\u0435\u0433", cidrv6: "IPv6 \u043E\u043F\u0441\u0435\u0433", base64: "base64-\u0435\u043D\u043A\u043E\u0434\u0438\u0440\u0430\u043D\u0430 \u043D\u0438\u0437\u0430", base64url: "base64url-\u0435\u043D\u043A\u043E\u0434\u0438\u0440\u0430\u043D\u0430 \u043D\u0438\u0437\u0430", json_string: "JSON \u043D\u0438\u0437\u0430", e164: "E.164 \u0431\u0440\u043E\u0458", jwt: "JWT", template_literal: "\u0432\u043D\u0435\u0441" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${Y.expected}, \u043F\u0440\u0438\u043C\u0435\u043D\u043E ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `Invalid input: expected ${S(Y.values[0])}`;
        return `\u0413\u0440\u0435\u0448\u0430\u043D\u0430 \u043E\u043F\u0446\u0438\u0458\u0430: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 \u0435\u0434\u043D\u0430 ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u0433\u043E\u043B\u0435\u043C: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${Y.origin ?? "\u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442\u0430"} \u0434\u0430 \u0438\u043C\u0430 ${W}${Y.maximum.toString()} ${z.unit ?? "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0438"}`;
        return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u0433\u043E\u043B\u0435\u043C: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${Y.origin ?? "\u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442\u0430"} \u0434\u0430 \u0431\u0438\u0434\u0435 ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u043C\u0430\u043B: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${Y.origin} \u0434\u0430 \u0438\u043C\u0430 ${W}${Y.minimum.toString()} ${z.unit}`;
        return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u043C\u0430\u043B: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${Y.origin} \u0434\u0430 \u0431\u0438\u0434\u0435 ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0437\u0430\u043F\u043E\u0447\u043D\u0443\u0432\u0430 \u0441\u043E "${W.prefix}"`;
        if (W.format === "ends_with") return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0437\u0430\u0432\u0440\u0448\u0443\u0432\u0430 \u0441\u043E "${W.suffix}"`;
        if (W.format === "includes") return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0432\u043A\u043B\u0443\u0447\u0443\u0432\u0430 "${W.includes}"`;
        if (W.format === "regex") return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u043E\u0434\u0433\u043E\u0430\u0440\u0430 \u043D\u0430 \u043F\u0430\u0442\u0435\u0440\u043D\u043E\u0442 ${W.pattern}`;
        return `Invalid ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `\u0413\u0440\u0435\u0448\u0435\u043D \u0431\u0440\u043E\u0458: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0431\u0438\u0434\u0435 \u0434\u0435\u043B\u0438\u0432 \u0441\u043E ${Y.divisor}`;
      case "unrecognized_keys":
        return `${Y.keys.length > 1 ? "\u041D\u0435\u043F\u0440\u0435\u043F\u043E\u0437\u043D\u0430\u0435\u043D\u0438 \u043A\u043B\u0443\u0447\u0435\u0432\u0438" : "\u041D\u0435\u043F\u0440\u0435\u043F\u043E\u0437\u043D\u0430\u0435\u043D \u043A\u043B\u0443\u0447"}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `\u0413\u0440\u0435\u0448\u0435\u043D \u043A\u043B\u0443\u0447 \u0432\u043E ${Y.origin}`;
      case "invalid_union":
        return "\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441";
      case "invalid_element":
        return `\u0413\u0440\u0435\u0448\u043D\u0430 \u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442 \u0432\u043E ${Y.origin}`;
      default:
        return "\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441";
    }
  };
};
function Y3() {
  return { localeError: eI() };
}
var $b = () => {
  let $ = { string: { unit: "aksara", verb: "mempunyai" }, file: { unit: "bait", verb: "mempunyai" }, array: { unit: "elemen", verb: "mempunyai" }, set: { unit: "elemen", verb: "mempunyai" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "nombor";
      case "object": {
        if (Array.isArray(Y)) return "array";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "input", email: "alamat e-mel", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "tarikh masa ISO", date: "tarikh ISO", time: "masa ISO", duration: "tempoh ISO", ipv4: "alamat IPv4", ipv6: "alamat IPv6", cidrv4: "julat IPv4", cidrv6: "julat IPv6", base64: "string dikodkan base64", base64url: "string dikodkan base64url", json_string: "string JSON", e164: "nombor E.164", jwt: "JWT", template_literal: "input" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `Input tidak sah: dijangka ${Y.expected}, diterima ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `Input tidak sah: dijangka ${S(Y.values[0])}`;
        return `Pilihan tidak sah: dijangka salah satu daripada ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `Terlalu besar: dijangka ${Y.origin ?? "nilai"} ${z.verb} ${W}${Y.maximum.toString()} ${z.unit ?? "elemen"}`;
        return `Terlalu besar: dijangka ${Y.origin ?? "nilai"} adalah ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `Terlalu kecil: dijangka ${Y.origin} ${z.verb} ${W}${Y.minimum.toString()} ${z.unit}`;
        return `Terlalu kecil: dijangka ${Y.origin} adalah ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `String tidak sah: mesti bermula dengan "${W.prefix}"`;
        if (W.format === "ends_with") return `String tidak sah: mesti berakhir dengan "${W.suffix}"`;
        if (W.format === "includes") return `String tidak sah: mesti mengandungi "${W.includes}"`;
        if (W.format === "regex") return `String tidak sah: mesti sepadan dengan corak ${W.pattern}`;
        return `${Q[W.format] ?? Y.format} tidak sah`;
      }
      case "not_multiple_of":
        return `Nombor tidak sah: perlu gandaan ${Y.divisor}`;
      case "unrecognized_keys":
        return `Kunci tidak dikenali: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `Kunci tidak sah dalam ${Y.origin}`;
      case "invalid_union":
        return "Input tidak sah";
      case "invalid_element":
        return `Nilai tidak sah dalam ${Y.origin}`;
      default:
        return "Input tidak sah";
    }
  };
};
function Q3() {
  return { localeError: $b() };
}
var Xb = () => {
  let $ = { string: { unit: "tekens" }, file: { unit: "bytes" }, array: { unit: "elementen" }, set: { unit: "elementen" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "getal";
      case "object": {
        if (Array.isArray(Y)) return "array";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "invoer", email: "emailadres", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO datum en tijd", date: "ISO datum", time: "ISO tijd", duration: "ISO duur", ipv4: "IPv4-adres", ipv6: "IPv6-adres", cidrv4: "IPv4-bereik", cidrv6: "IPv6-bereik", base64: "base64-gecodeerde tekst", base64url: "base64 URL-gecodeerde tekst", json_string: "JSON string", e164: "E.164-nummer", jwt: "JWT", template_literal: "invoer" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `Ongeldige invoer: verwacht ${Y.expected}, ontving ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `Ongeldige invoer: verwacht ${S(Y.values[0])}`;
        return `Ongeldige optie: verwacht \xE9\xE9n van ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `Te lang: verwacht dat ${Y.origin ?? "waarde"} ${W}${Y.maximum.toString()} ${z.unit ?? "elementen"} bevat`;
        return `Te lang: verwacht dat ${Y.origin ?? "waarde"} ${W}${Y.maximum.toString()} is`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `Te kort: verwacht dat ${Y.origin} ${W}${Y.minimum.toString()} ${z.unit} bevat`;
        return `Te kort: verwacht dat ${Y.origin} ${W}${Y.minimum.toString()} is`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `Ongeldige tekst: moet met "${W.prefix}" beginnen`;
        if (W.format === "ends_with") return `Ongeldige tekst: moet op "${W.suffix}" eindigen`;
        if (W.format === "includes") return `Ongeldige tekst: moet "${W.includes}" bevatten`;
        if (W.format === "regex") return `Ongeldige tekst: moet overeenkomen met patroon ${W.pattern}`;
        return `Ongeldig: ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `Ongeldig getal: moet een veelvoud van ${Y.divisor} zijn`;
      case "unrecognized_keys":
        return `Onbekende key${Y.keys.length > 1 ? "s" : ""}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `Ongeldige key in ${Y.origin}`;
      case "invalid_union":
        return "Ongeldige invoer";
      case "invalid_element":
        return `Ongeldige waarde in ${Y.origin}`;
      default:
        return "Ongeldige invoer";
    }
  };
};
function W3() {
  return { localeError: Xb() };
}
var Jb = () => {
  let $ = { string: { unit: "tegn", verb: "\xE5 ha" }, file: { unit: "bytes", verb: "\xE5 ha" }, array: { unit: "elementer", verb: "\xE5 inneholde" }, set: { unit: "elementer", verb: "\xE5 inneholde" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "tall";
      case "object": {
        if (Array.isArray(Y)) return "liste";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "input", email: "e-postadresse", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO dato- og klokkeslett", date: "ISO-dato", time: "ISO-klokkeslett", duration: "ISO-varighet", ipv4: "IPv4-omr\xE5de", ipv6: "IPv6-omr\xE5de", cidrv4: "IPv4-spekter", cidrv6: "IPv6-spekter", base64: "base64-enkodet streng", base64url: "base64url-enkodet streng", json_string: "JSON-streng", e164: "E.164-nummer", jwt: "JWT", template_literal: "input" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `Ugyldig input: forventet ${Y.expected}, fikk ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `Ugyldig verdi: forventet ${S(Y.values[0])}`;
        return `Ugyldig valg: forventet en av ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `For stor(t): forventet ${Y.origin ?? "value"} til \xE5 ha ${W}${Y.maximum.toString()} ${z.unit ?? "elementer"}`;
        return `For stor(t): forventet ${Y.origin ?? "value"} til \xE5 ha ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `For lite(n): forventet ${Y.origin} til \xE5 ha ${W}${Y.minimum.toString()} ${z.unit}`;
        return `For lite(n): forventet ${Y.origin} til \xE5 ha ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `Ugyldig streng: m\xE5 starte med "${W.prefix}"`;
        if (W.format === "ends_with") return `Ugyldig streng: m\xE5 ende med "${W.suffix}"`;
        if (W.format === "includes") return `Ugyldig streng: m\xE5 inneholde "${W.includes}"`;
        if (W.format === "regex") return `Ugyldig streng: m\xE5 matche m\xF8nsteret ${W.pattern}`;
        return `Ugyldig ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `Ugyldig tall: m\xE5 v\xE6re et multiplum av ${Y.divisor}`;
      case "unrecognized_keys":
        return `${Y.keys.length > 1 ? "Ukjente n\xF8kler" : "Ukjent n\xF8kkel"}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `Ugyldig n\xF8kkel i ${Y.origin}`;
      case "invalid_union":
        return "Ugyldig input";
      case "invalid_element":
        return `Ugyldig verdi i ${Y.origin}`;
      default:
        return "Ugyldig input";
    }
  };
};
function z3() {
  return { localeError: Jb() };
}
var Yb = () => {
  let $ = { string: { unit: "harf", verb: "olmal\u0131d\u0131r" }, file: { unit: "bayt", verb: "olmal\u0131d\u0131r" }, array: { unit: "unsur", verb: "olmal\u0131d\u0131r" }, set: { unit: "unsur", verb: "olmal\u0131d\u0131r" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "numara";
      case "object": {
        if (Array.isArray(Y)) return "saf";
        if (Y === null) return "gayb";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "giren", email: "epostag\xE2h", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO heng\xE2m\u0131", date: "ISO tarihi", time: "ISO zaman\u0131", duration: "ISO m\xFCddeti", ipv4: "IPv4 ni\u015F\xE2n\u0131", ipv6: "IPv6 ni\u015F\xE2n\u0131", cidrv4: "IPv4 menzili", cidrv6: "IPv6 menzili", base64: "base64-\u015Fifreli metin", base64url: "base64url-\u015Fifreli metin", json_string: "JSON metin", e164: "E.164 say\u0131s\u0131", jwt: "JWT", template_literal: "giren" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `F\xE2sit giren: umulan ${Y.expected}, al\u0131nan ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `F\xE2sit giren: umulan ${S(Y.values[0])}`;
        return `F\xE2sit tercih: m\xFBteberler ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `Fazla b\xFCy\xFCk: ${Y.origin ?? "value"}, ${W}${Y.maximum.toString()} ${z.unit ?? "elements"} sahip olmal\u0131yd\u0131.`;
        return `Fazla b\xFCy\xFCk: ${Y.origin ?? "value"}, ${W}${Y.maximum.toString()} olmal\u0131yd\u0131.`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `Fazla k\xFC\xE7\xFCk: ${Y.origin}, ${W}${Y.minimum.toString()} ${z.unit} sahip olmal\u0131yd\u0131.`;
        return `Fazla k\xFC\xE7\xFCk: ${Y.origin}, ${W}${Y.minimum.toString()} olmal\u0131yd\u0131.`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `F\xE2sit metin: "${W.prefix}" ile ba\u015Flamal\u0131.`;
        if (W.format === "ends_with") return `F\xE2sit metin: "${W.suffix}" ile bitmeli.`;
        if (W.format === "includes") return `F\xE2sit metin: "${W.includes}" ihtiv\xE2 etmeli.`;
        if (W.format === "regex") return `F\xE2sit metin: ${W.pattern} nak\u015F\u0131na uymal\u0131.`;
        return `F\xE2sit ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `F\xE2sit say\u0131: ${Y.divisor} kat\u0131 olmal\u0131yd\u0131.`;
      case "unrecognized_keys":
        return `Tan\u0131nmayan anahtar ${Y.keys.length > 1 ? "s" : ""}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `${Y.origin} i\xE7in tan\u0131nmayan anahtar var.`;
      case "invalid_union":
        return "Giren tan\u0131namad\u0131.";
      case "invalid_element":
        return `${Y.origin} i\xE7in tan\u0131nmayan k\u0131ymet var.`;
      default:
        return "K\u0131ymet tan\u0131namad\u0131.";
    }
  };
};
function G3() {
  return { localeError: Yb() };
}
var Qb = () => {
  let $ = { string: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" }, file: { unit: "\u0628\u0627\u06CC\u067C\u0633", verb: "\u0648\u0644\u0631\u064A" }, array: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" }, set: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "\u0639\u062F\u062F";
      case "object": {
        if (Array.isArray(Y)) return "\u0627\u0631\u06D0";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "\u0648\u0631\u0648\u062F\u064A", email: "\u0628\u0631\u06CC\u069A\u0646\u0627\u0644\u06CC\u06A9", url: "\u06CC\u0648 \u0622\u0631 \u0627\u0644", emoji: "\u0627\u06CC\u0645\u0648\u062C\u064A", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "\u0646\u06CC\u067C\u0647 \u0627\u0648 \u0648\u062E\u062A", date: "\u0646\u06D0\u067C\u0647", time: "\u0648\u062E\u062A", duration: "\u0645\u0648\u062F\u0647", ipv4: "\u062F IPv4 \u067E\u062A\u0647", ipv6: "\u062F IPv6 \u067E\u062A\u0647", cidrv4: "\u062F IPv4 \u0633\u0627\u062D\u0647", cidrv6: "\u062F IPv6 \u0633\u0627\u062D\u0647", base64: "base64-encoded \u0645\u062A\u0646", base64url: "base64url-encoded \u0645\u062A\u0646", json_string: "JSON \u0645\u062A\u0646", e164: "\u062F E.164 \u0634\u0645\u06D0\u0631\u0647", jwt: "JWT", template_literal: "\u0648\u0631\u0648\u062F\u064A" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `\u0646\u0627\u0633\u0645 \u0648\u0631\u0648\u062F\u064A: \u0628\u0627\u06CC\u062F ${Y.expected} \u0648\u0627\u06CC, \u0645\u06AB\u0631 ${J(Y.input)} \u062A\u0631\u0644\u0627\u0633\u0647 \u0634\u0648`;
      case "invalid_value":
        if (Y.values.length === 1) return `\u0646\u0627\u0633\u0645 \u0648\u0631\u0648\u062F\u064A: \u0628\u0627\u06CC\u062F ${S(Y.values[0])} \u0648\u0627\u06CC`;
        return `\u0646\u0627\u0633\u0645 \u0627\u0646\u062A\u062E\u0627\u0628: \u0628\u0627\u06CC\u062F \u06CC\u0648 \u0644\u0647 ${M(Y.values, "|")} \u0685\u062E\u0647 \u0648\u0627\u06CC`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `\u0689\u06CC\u0631 \u0644\u0648\u06CC: ${Y.origin ?? "\u0627\u0631\u0632\u069A\u062A"} \u0628\u0627\u06CC\u062F ${W}${Y.maximum.toString()} ${z.unit ?? "\u0639\u0646\u0635\u0631\u0648\u0646\u0647"} \u0648\u0644\u0631\u064A`;
        return `\u0689\u06CC\u0631 \u0644\u0648\u06CC: ${Y.origin ?? "\u0627\u0631\u0632\u069A\u062A"} \u0628\u0627\u06CC\u062F ${W}${Y.maximum.toString()} \u0648\u064A`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `\u0689\u06CC\u0631 \u06A9\u0648\u0686\u0646\u06CC: ${Y.origin} \u0628\u0627\u06CC\u062F ${W}${Y.minimum.toString()} ${z.unit} \u0648\u0644\u0631\u064A`;
        return `\u0689\u06CC\u0631 \u06A9\u0648\u0686\u0646\u06CC: ${Y.origin} \u0628\u0627\u06CC\u062F ${W}${Y.minimum.toString()} \u0648\u064A`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F "${W.prefix}" \u0633\u0631\u0647 \u067E\u06CC\u0644 \u0634\u064A`;
        if (W.format === "ends_with") return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F "${W.suffix}" \u0633\u0631\u0647 \u067E\u0627\u06CC \u062A\u0647 \u0648\u0631\u0633\u064A\u0696\u064A`;
        if (W.format === "includes") return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F "${W.includes}" \u0648\u0644\u0631\u064A`;
        if (W.format === "regex") return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F ${W.pattern} \u0633\u0631\u0647 \u0645\u0637\u0627\u0628\u0642\u062A \u0648\u0644\u0631\u064A`;
        return `${Q[W.format] ?? Y.format} \u0646\u0627\u0633\u0645 \u062F\u06CC`;
      }
      case "not_multiple_of":
        return `\u0646\u0627\u0633\u0645 \u0639\u062F\u062F: \u0628\u0627\u06CC\u062F \u062F ${Y.divisor} \u0645\u0636\u0631\u0628 \u0648\u064A`;
      case "unrecognized_keys":
        return `\u0646\u0627\u0633\u0645 ${Y.keys.length > 1 ? "\u06A9\u0644\u06CC\u0689\u0648\u0646\u0647" : "\u06A9\u0644\u06CC\u0689"}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `\u0646\u0627\u0633\u0645 \u06A9\u0644\u06CC\u0689 \u067E\u0647 ${Y.origin} \u06A9\u06D0`;
      case "invalid_union":
        return "\u0646\u0627\u0633\u0645\u0647 \u0648\u0631\u0648\u062F\u064A";
      case "invalid_element":
        return `\u0646\u0627\u0633\u0645 \u0639\u0646\u0635\u0631 \u067E\u0647 ${Y.origin} \u06A9\u06D0`;
      default:
        return "\u0646\u0627\u0633\u0645\u0647 \u0648\u0631\u0648\u062F\u064A";
    }
  };
};
function U3() {
  return { localeError: Qb() };
}
var Wb = () => {
  let $ = { string: { unit: "znak\xF3w", verb: "mie\u0107" }, file: { unit: "bajt\xF3w", verb: "mie\u0107" }, array: { unit: "element\xF3w", verb: "mie\u0107" }, set: { unit: "element\xF3w", verb: "mie\u0107" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "liczba";
      case "object": {
        if (Array.isArray(Y)) return "tablica";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "wyra\u017Cenie", email: "adres email", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "data i godzina w formacie ISO", date: "data w formacie ISO", time: "godzina w formacie ISO", duration: "czas trwania ISO", ipv4: "adres IPv4", ipv6: "adres IPv6", cidrv4: "zakres IPv4", cidrv6: "zakres IPv6", base64: "ci\u0105g znak\xF3w zakodowany w formacie base64", base64url: "ci\u0105g znak\xF3w zakodowany w formacie base64url", json_string: "ci\u0105g znak\xF3w w formacie JSON", e164: "liczba E.164", jwt: "JWT", template_literal: "wej\u015Bcie" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano ${Y.expected}, otrzymano ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano ${S(Y.values[0])}`;
        return `Nieprawid\u0142owa opcja: oczekiwano jednej z warto\u015Bci ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `Za du\u017Ca warto\u015B\u0107: oczekiwano, \u017Ce ${Y.origin ?? "warto\u015B\u0107"} b\u0119dzie mie\u0107 ${W}${Y.maximum.toString()} ${z.unit ?? "element\xF3w"}`;
        return `Zbyt du\u017C(y/a/e): oczekiwano, \u017Ce ${Y.origin ?? "warto\u015B\u0107"} b\u0119dzie wynosi\u0107 ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `Za ma\u0142a warto\u015B\u0107: oczekiwano, \u017Ce ${Y.origin ?? "warto\u015B\u0107"} b\u0119dzie mie\u0107 ${W}${Y.minimum.toString()} ${z.unit ?? "element\xF3w"}`;
        return `Zbyt ma\u0142(y/a/e): oczekiwano, \u017Ce ${Y.origin ?? "warto\u015B\u0107"} b\u0119dzie wynosi\u0107 ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi zaczyna\u0107 si\u0119 od "${W.prefix}"`;
        if (W.format === "ends_with") return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi ko\u0144czy\u0107 si\u0119 na "${W.suffix}"`;
        if (W.format === "includes") return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi zawiera\u0107 "${W.includes}"`;
        if (W.format === "regex") return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi odpowiada\u0107 wzorcowi ${W.pattern}`;
        return `Nieprawid\u0142ow(y/a/e) ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `Nieprawid\u0142owa liczba: musi by\u0107 wielokrotno\u015Bci\u0105 ${Y.divisor}`;
      case "unrecognized_keys":
        return `Nierozpoznane klucze${Y.keys.length > 1 ? "s" : ""}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `Nieprawid\u0142owy klucz w ${Y.origin}`;
      case "invalid_union":
        return "Nieprawid\u0142owe dane wej\u015Bciowe";
      case "invalid_element":
        return `Nieprawid\u0142owa warto\u015B\u0107 w ${Y.origin}`;
      default:
        return "Nieprawid\u0142owe dane wej\u015Bciowe";
    }
  };
};
function H3() {
  return { localeError: Wb() };
}
var zb = () => {
  let $ = { string: { unit: "caracteres", verb: "ter" }, file: { unit: "bytes", verb: "ter" }, array: { unit: "itens", verb: "ter" }, set: { unit: "itens", verb: "ter" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "n\xFAmero";
      case "object": {
        if (Array.isArray(Y)) return "array";
        if (Y === null) return "nulo";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "padr\xE3o", email: "endere\xE7o de e-mail", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "data e hora ISO", date: "data ISO", time: "hora ISO", duration: "dura\xE7\xE3o ISO", ipv4: "endere\xE7o IPv4", ipv6: "endere\xE7o IPv6", cidrv4: "faixa de IPv4", cidrv6: "faixa de IPv6", base64: "texto codificado em base64", base64url: "URL codificada em base64", json_string: "texto JSON", e164: "n\xFAmero E.164", jwt: "JWT", template_literal: "entrada" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `Tipo inv\xE1lido: esperado ${Y.expected}, recebido ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `Entrada inv\xE1lida: esperado ${S(Y.values[0])}`;
        return `Op\xE7\xE3o inv\xE1lida: esperada uma das ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `Muito grande: esperado que ${Y.origin ?? "valor"} tivesse ${W}${Y.maximum.toString()} ${z.unit ?? "elementos"}`;
        return `Muito grande: esperado que ${Y.origin ?? "valor"} fosse ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `Muito pequeno: esperado que ${Y.origin} tivesse ${W}${Y.minimum.toString()} ${z.unit}`;
        return `Muito pequeno: esperado que ${Y.origin} fosse ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `Texto inv\xE1lido: deve come\xE7ar com "${W.prefix}"`;
        if (W.format === "ends_with") return `Texto inv\xE1lido: deve terminar com "${W.suffix}"`;
        if (W.format === "includes") return `Texto inv\xE1lido: deve incluir "${W.includes}"`;
        if (W.format === "regex") return `Texto inv\xE1lido: deve corresponder ao padr\xE3o ${W.pattern}`;
        return `${Q[W.format] ?? Y.format} inv\xE1lido`;
      }
      case "not_multiple_of":
        return `N\xFAmero inv\xE1lido: deve ser m\xFAltiplo de ${Y.divisor}`;
      case "unrecognized_keys":
        return `Chave${Y.keys.length > 1 ? "s" : ""} desconhecida${Y.keys.length > 1 ? "s" : ""}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `Chave inv\xE1lida em ${Y.origin}`;
      case "invalid_union":
        return "Entrada inv\xE1lida";
      case "invalid_element":
        return `Valor inv\xE1lido em ${Y.origin}`;
      default:
        return "Campo inv\xE1lido";
    }
  };
};
function K3() {
  return { localeError: zb() };
}
function BN($, X, J, Q) {
  let Y = Math.abs($), W = Y % 10, z = Y % 100;
  if (z >= 11 && z <= 19) return Q;
  if (W === 1) return X;
  if (W >= 2 && W <= 4) return J;
  return Q;
}
var Gb = () => {
  let $ = { string: { unit: { one: "\u0441\u0438\u043C\u0432\u043E\u043B", few: "\u0441\u0438\u043C\u0432\u043E\u043B\u0430", many: "\u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432" }, verb: "\u0438\u043C\u0435\u0442\u044C" }, file: { unit: { one: "\u0431\u0430\u0439\u0442", few: "\u0431\u0430\u0439\u0442\u0430", many: "\u0431\u0430\u0439\u0442" }, verb: "\u0438\u043C\u0435\u0442\u044C" }, array: { unit: { one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442", few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430", many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432" }, verb: "\u0438\u043C\u0435\u0442\u044C" }, set: { unit: { one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442", few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430", many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432" }, verb: "\u0438\u043C\u0435\u0442\u044C" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "\u0447\u0438\u0441\u043B\u043E";
      case "object": {
        if (Array.isArray(Y)) return "\u043C\u0430\u0441\u0441\u0438\u0432";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "\u0432\u0432\u043E\u0434", email: "email \u0430\u0434\u0440\u0435\u0441", url: "URL", emoji: "\u044D\u043C\u043E\u0434\u0437\u0438", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO \u0434\u0430\u0442\u0430 \u0438 \u0432\u0440\u0435\u043C\u044F", date: "ISO \u0434\u0430\u0442\u0430", time: "ISO \u0432\u0440\u0435\u043C\u044F", duration: "ISO \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C", ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441", ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441", cidrv4: "IPv4 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D", cidrv6: "IPv6 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D", base64: "\u0441\u0442\u0440\u043E\u043A\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 base64", base64url: "\u0441\u0442\u0440\u043E\u043A\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 base64url", json_string: "JSON \u0441\u0442\u0440\u043E\u043A\u0430", e164: "\u043D\u043E\u043C\u0435\u0440 E.164", jwt: "JWT", template_literal: "\u0432\u0432\u043E\u0434" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0432\u043E\u0434: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C ${Y.expected}, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0432\u043E\u0434: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C ${S(Y.values[0])}`;
        return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0434\u043D\u043E \u0438\u0437 ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) {
          let G = Number(Y.maximum), U = BN(G, z.unit.one, z.unit.few, z.unit.many);
          return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${Y.origin ?? "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435"} \u0431\u0443\u0434\u0435\u0442 \u0438\u043C\u0435\u0442\u044C ${W}${Y.maximum.toString()} ${U}`;
        }
        return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${Y.origin ?? "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435"} \u0431\u0443\u0434\u0435\u0442 ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) {
          let G = Number(Y.minimum), U = BN(G, z.unit.one, z.unit.few, z.unit.many);
          return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${Y.origin} \u0431\u0443\u0434\u0435\u0442 \u0438\u043C\u0435\u0442\u044C ${W}${Y.minimum.toString()} ${U}`;
        }
        return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${Y.origin} \u0431\u0443\u0434\u0435\u0442 ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u043D\u0430\u0447\u0438\u043D\u0430\u0442\u044C\u0441\u044F \u0441 "${W.prefix}"`;
        if (W.format === "ends_with") return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0437\u0430\u043A\u0430\u043D\u0447\u0438\u0432\u0430\u0442\u044C\u0441\u044F \u043D\u0430 "${W.suffix}"`;
        if (W.format === "includes") return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C "${W.includes}"`;
        if (W.format === "regex") return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${W.pattern}`;
        return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E: \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043A\u0440\u0430\u0442\u043D\u044B\u043C ${Y.divisor}`;
      case "unrecognized_keys":
        return `\u041D\u0435\u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u043D${Y.keys.length > 1 ? "\u044B\u0435" : "\u044B\u0439"} \u043A\u043B\u044E\u0447${Y.keys.length > 1 ? "\u0438" : ""}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043A\u043B\u044E\u0447 \u0432 ${Y.origin}`;
      case "invalid_union":
        return "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0432\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435";
      case "invalid_element":
        return `\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0432 ${Y.origin}`;
      default:
        return "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0432\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435";
    }
  };
};
function V3() {
  return { localeError: Gb() };
}
var Ub = () => {
  let $ = { string: { unit: "znakov", verb: "imeti" }, file: { unit: "bajtov", verb: "imeti" }, array: { unit: "elementov", verb: "imeti" }, set: { unit: "elementov", verb: "imeti" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "\u0161tevilo";
      case "object": {
        if (Array.isArray(Y)) return "tabela";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "vnos", email: "e-po\u0161tni naslov", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO datum in \u010Das", date: "ISO datum", time: "ISO \u010Das", duration: "ISO trajanje", ipv4: "IPv4 naslov", ipv6: "IPv6 naslov", cidrv4: "obseg IPv4", cidrv6: "obseg IPv6", base64: "base64 kodiran niz", base64url: "base64url kodiran niz", json_string: "JSON niz", e164: "E.164 \u0161tevilka", jwt: "JWT", template_literal: "vnos" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `Neveljaven vnos: pri\u010Dakovano ${Y.expected}, prejeto ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `Neveljaven vnos: pri\u010Dakovano ${S(Y.values[0])}`;
        return `Neveljavna mo\u017Enost: pri\u010Dakovano eno izmed ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `Preveliko: pri\u010Dakovano, da bo ${Y.origin ?? "vrednost"} imelo ${W}${Y.maximum.toString()} ${z.unit ?? "elementov"}`;
        return `Preveliko: pri\u010Dakovano, da bo ${Y.origin ?? "vrednost"} ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `Premajhno: pri\u010Dakovano, da bo ${Y.origin} imelo ${W}${Y.minimum.toString()} ${z.unit}`;
        return `Premajhno: pri\u010Dakovano, da bo ${Y.origin} ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `Neveljaven niz: mora se za\u010Deti z "${W.prefix}"`;
        if (W.format === "ends_with") return `Neveljaven niz: mora se kon\u010Dati z "${W.suffix}"`;
        if (W.format === "includes") return `Neveljaven niz: mora vsebovati "${W.includes}"`;
        if (W.format === "regex") return `Neveljaven niz: mora ustrezati vzorcu ${W.pattern}`;
        return `Neveljaven ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `Neveljavno \u0161tevilo: mora biti ve\u010Dkratnik ${Y.divisor}`;
      case "unrecognized_keys":
        return `Neprepoznan${Y.keys.length > 1 ? "i klju\u010Di" : " klju\u010D"}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `Neveljaven klju\u010D v ${Y.origin}`;
      case "invalid_union":
        return "Neveljaven vnos";
      case "invalid_element":
        return `Neveljavna vrednost v ${Y.origin}`;
      default:
        return "Neveljaven vnos";
    }
  };
};
function N3() {
  return { localeError: Ub() };
}
var Hb = () => {
  let $ = { string: { unit: "tecken", verb: "att ha" }, file: { unit: "bytes", verb: "att ha" }, array: { unit: "objekt", verb: "att inneh\xE5lla" }, set: { unit: "objekt", verb: "att inneh\xE5lla" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "antal";
      case "object": {
        if (Array.isArray(Y)) return "lista";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "regulj\xE4rt uttryck", email: "e-postadress", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO-datum och tid", date: "ISO-datum", time: "ISO-tid", duration: "ISO-varaktighet", ipv4: "IPv4-intervall", ipv6: "IPv6-intervall", cidrv4: "IPv4-spektrum", cidrv6: "IPv6-spektrum", base64: "base64-kodad str\xE4ng", base64url: "base64url-kodad str\xE4ng", json_string: "JSON-str\xE4ng", e164: "E.164-nummer", jwt: "JWT", template_literal: "mall-literal" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `Ogiltig inmatning: f\xF6rv\xE4ntat ${Y.expected}, fick ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `Ogiltig inmatning: f\xF6rv\xE4ntat ${S(Y.values[0])}`;
        return `Ogiltigt val: f\xF6rv\xE4ntade en av ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `F\xF6r stor(t): f\xF6rv\xE4ntade ${Y.origin ?? "v\xE4rdet"} att ha ${W}${Y.maximum.toString()} ${z.unit ?? "element"}`;
        return `F\xF6r stor(t): f\xF6rv\xE4ntat ${Y.origin ?? "v\xE4rdet"} att ha ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `F\xF6r lite(t): f\xF6rv\xE4ntade ${Y.origin ?? "v\xE4rdet"} att ha ${W}${Y.minimum.toString()} ${z.unit}`;
        return `F\xF6r lite(t): f\xF6rv\xE4ntade ${Y.origin ?? "v\xE4rdet"} att ha ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `Ogiltig str\xE4ng: m\xE5ste b\xF6rja med "${W.prefix}"`;
        if (W.format === "ends_with") return `Ogiltig str\xE4ng: m\xE5ste sluta med "${W.suffix}"`;
        if (W.format === "includes") return `Ogiltig str\xE4ng: m\xE5ste inneh\xE5lla "${W.includes}"`;
        if (W.format === "regex") return `Ogiltig str\xE4ng: m\xE5ste matcha m\xF6nstret "${W.pattern}"`;
        return `Ogiltig(t) ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `Ogiltigt tal: m\xE5ste vara en multipel av ${Y.divisor}`;
      case "unrecognized_keys":
        return `${Y.keys.length > 1 ? "Ok\xE4nda nycklar" : "Ok\xE4nd nyckel"}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `Ogiltig nyckel i ${Y.origin ?? "v\xE4rdet"}`;
      case "invalid_union":
        return "Ogiltig input";
      case "invalid_element":
        return `Ogiltigt v\xE4rde i ${Y.origin ?? "v\xE4rdet"}`;
      default:
        return "Ogiltig input";
    }
  };
};
function O3() {
  return { localeError: Hb() };
}
var Kb = () => {
  let $ = { string: { unit: "\u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0B95\u0BCD\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" }, file: { unit: "\u0BAA\u0BC8\u0B9F\u0BCD\u0B9F\u0BC1\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" }, array: { unit: "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" }, set: { unit: "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "\u0B8E\u0BA3\u0BCD \u0B85\u0BB2\u0BCD\u0BB2\u0BBE\u0BA4\u0BA4\u0BC1" : "\u0B8E\u0BA3\u0BCD";
      case "object": {
        if (Array.isArray(Y)) return "\u0B85\u0BA3\u0BBF";
        if (Y === null) return "\u0BB5\u0BC6\u0BB1\u0BC1\u0BAE\u0BC8";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "\u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1", email: "\u0BAE\u0BBF\u0BA9\u0BCD\u0BA9\u0B9E\u0BCD\u0B9A\u0BB2\u0BCD \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO \u0BA4\u0BC7\u0BA4\u0BBF \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD", date: "ISO \u0BA4\u0BC7\u0BA4\u0BBF", time: "ISO \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD", duration: "ISO \u0B95\u0BBE\u0BB2 \u0B85\u0BB3\u0BB5\u0BC1", ipv4: "IPv4 \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF", ipv6: "IPv6 \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF", cidrv4: "IPv4 \u0BB5\u0BB0\u0BAE\u0BCD\u0BAA\u0BC1", cidrv6: "IPv6 \u0BB5\u0BB0\u0BAE\u0BCD\u0BAA\u0BC1", base64: "base64-encoded \u0B9A\u0BB0\u0BAE\u0BCD", base64url: "base64url-encoded \u0B9A\u0BB0\u0BAE\u0BCD", json_string: "JSON \u0B9A\u0BB0\u0BAE\u0BCD", e164: "E.164 \u0B8E\u0BA3\u0BCD", jwt: "JWT", template_literal: "input" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${Y.expected}, \u0BAA\u0BC6\u0BB1\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${S(Y.values[0])}`;
        return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BB5\u0BBF\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BAE\u0BCD: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${M(Y.values, "|")} \u0B87\u0BB2\u0BCD \u0B92\u0BA9\u0BCD\u0BB1\u0BC1`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `\u0BAE\u0BBF\u0B95 \u0BAA\u0BC6\u0BB0\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${Y.origin ?? "\u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1"} ${W}${Y.maximum.toString()} ${z.unit ?? "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD"} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        return `\u0BAE\u0BBF\u0B95 \u0BAA\u0BC6\u0BB0\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${Y.origin ?? "\u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1"} ${W}${Y.maximum.toString()} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `\u0BAE\u0BBF\u0B95\u0B9A\u0BCD \u0B9A\u0BBF\u0BB1\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${Y.origin} ${W}${Y.minimum.toString()} ${z.unit} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        return `\u0BAE\u0BBF\u0B95\u0B9A\u0BCD \u0B9A\u0BBF\u0BB1\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${Y.origin} ${W}${Y.minimum.toString()} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${W.prefix}" \u0B87\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        if (W.format === "ends_with") return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${W.suffix}" \u0B87\u0BB2\u0BCD \u0BAE\u0BC1\u0B9F\u0BBF\u0BB5\u0B9F\u0BC8\u0BAF \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        if (W.format === "includes") return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${W.includes}" \u0B90 \u0B89\u0BB3\u0BCD\u0BB3\u0B9F\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        if (W.format === "regex") return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: ${W.pattern} \u0BAE\u0BC1\u0BB1\u0BC8\u0BAA\u0BBE\u0B9F\u0BCD\u0B9F\u0BC1\u0B9F\u0BA9\u0BCD \u0BAA\u0BCA\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B8E\u0BA3\u0BCD: ${Y.divisor} \u0B87\u0BA9\u0BCD \u0BAA\u0BB2\u0BAE\u0BBE\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
      case "unrecognized_keys":
        return `\u0B85\u0B9F\u0BC8\u0BAF\u0BBE\u0BB3\u0BAE\u0BCD \u0BA4\u0BC6\u0BB0\u0BBF\u0BAF\u0BBE\u0BA4 \u0BB5\u0BBF\u0B9A\u0BC8${Y.keys.length > 1 ? "\u0B95\u0BB3\u0BCD" : ""}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `${Y.origin} \u0B87\u0BB2\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BB5\u0BBF\u0B9A\u0BC8`;
      case "invalid_union":
        return "\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1";
      case "invalid_element":
        return `${Y.origin} \u0B87\u0BB2\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1`;
      default:
        return "\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1";
    }
  };
};
function w3() {
  return { localeError: Kb() };
}
var Vb = () => {
  let $ = { string: { unit: "\u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" }, file: { unit: "\u0E44\u0E1A\u0E15\u0E4C", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" }, array: { unit: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" }, set: { unit: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 (NaN)" : "\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02";
      case "object": {
        if (Array.isArray(Y)) return "\u0E2D\u0E32\u0E23\u0E4C\u0E40\u0E23\u0E22\u0E4C (Array)";
        if (Y === null) return "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E04\u0E48\u0E32 (null)";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E1B\u0E49\u0E2D\u0E19", email: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E2D\u0E35\u0E40\u0E21\u0E25", url: "URL", emoji: "\u0E2D\u0E34\u0E42\u0E21\u0E08\u0E34", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO", date: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E41\u0E1A\u0E1A ISO", time: "\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO", duration: "\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO", ipv4: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48 IPv4", ipv6: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48 IPv6", cidrv4: "\u0E0A\u0E48\u0E27\u0E07 IP \u0E41\u0E1A\u0E1A IPv4", cidrv6: "\u0E0A\u0E48\u0E27\u0E07 IP \u0E41\u0E1A\u0E1A IPv6", base64: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A Base64", base64url: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A Base64 \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A URL", json_string: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A JSON", e164: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28 (E.164)", jwt: "\u0E42\u0E17\u0E40\u0E04\u0E19 JWT", template_literal: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E1B\u0E49\u0E2D\u0E19" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19 ${Y.expected} \u0E41\u0E15\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `\u0E04\u0E48\u0E32\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19 ${S(Y.values[0])}`;
        return `\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E43\u0E19 ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19" : "\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32", z = X(Y.origin);
        if (z) return `\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14: ${Y.origin ?? "\u0E04\u0E48\u0E32"} \u0E04\u0E27\u0E23\u0E21\u0E35${W} ${Y.maximum.toString()} ${z.unit ?? "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"}`;
        return `\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14: ${Y.origin ?? "\u0E04\u0E48\u0E32"} \u0E04\u0E27\u0E23\u0E21\u0E35${W} ${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? "\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22" : "\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32", z = X(Y.origin);
        if (z) return `\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E01\u0E33\u0E2B\u0E19\u0E14: ${Y.origin} \u0E04\u0E27\u0E23\u0E21\u0E35${W} ${Y.minimum.toString()} ${z.unit}`;
        return `\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E01\u0E33\u0E2B\u0E19\u0E14: ${Y.origin} \u0E04\u0E27\u0E23\u0E21\u0E35${W} ${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E02\u0E36\u0E49\u0E19\u0E15\u0E49\u0E19\u0E14\u0E49\u0E27\u0E22 "${W.prefix}"`;
        if (W.format === "ends_with") return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E25\u0E07\u0E17\u0E49\u0E32\u0E22\u0E14\u0E49\u0E27\u0E22 "${W.suffix}"`;
        if (W.format === "includes") return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35 "${W.includes}" \u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21`;
        if (W.format === "regex") return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E15\u0E49\u0E2D\u0E07\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14 ${W.pattern}`;
        return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E32\u0E23\u0E14\u0E49\u0E27\u0E22 ${Y.divisor} \u0E44\u0E14\u0E49\u0E25\u0E07\u0E15\u0E31\u0E27`;
      case "unrecognized_keys":
        return `\u0E1E\u0E1A\u0E04\u0E35\u0E22\u0E4C\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `\u0E04\u0E35\u0E22\u0E4C\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E19 ${Y.origin}`;
      case "invalid_union":
        return "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E22\u0E39\u0E40\u0E19\u0E35\u0E22\u0E19\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E44\u0E27\u0E49";
      case "invalid_element":
        return `\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E19 ${Y.origin}`;
      default:
        return "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07";
    }
  };
};
function B3() {
  return { localeError: Vb() };
}
var Nb = ($) => {
  let X = typeof $;
  switch (X) {
    case "number":
      return Number.isNaN($) ? "NaN" : "number";
    case "object": {
      if (Array.isArray($)) return "array";
      if ($ === null) return "null";
      if (Object.getPrototypeOf($) !== Object.prototype && $.constructor) return $.constructor.name;
    }
  }
  return X;
};
var Ob = () => {
  let $ = { string: { unit: "karakter", verb: "olmal\u0131" }, file: { unit: "bayt", verb: "olmal\u0131" }, array: { unit: "\xF6\u011Fe", verb: "olmal\u0131" }, set: { unit: "\xF6\u011Fe", verb: "olmal\u0131" } };
  function X(Q) {
    return $[Q] ?? null;
  }
  let J = { regex: "girdi", email: "e-posta adresi", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO tarih ve saat", date: "ISO tarih", time: "ISO saat", duration: "ISO s\xFCre", ipv4: "IPv4 adresi", ipv6: "IPv6 adresi", cidrv4: "IPv4 aral\u0131\u011F\u0131", cidrv6: "IPv6 aral\u0131\u011F\u0131", base64: "base64 ile \u015Fifrelenmi\u015F metin", base64url: "base64url ile \u015Fifrelenmi\u015F metin", json_string: "JSON dizesi", e164: "E.164 say\u0131s\u0131", jwt: "JWT", template_literal: "\u015Eablon dizesi" };
  return (Q) => {
    switch (Q.code) {
      case "invalid_type":
        return `Ge\xE7ersiz de\u011Fer: beklenen ${Q.expected}, al\u0131nan ${Nb(Q.input)}`;
      case "invalid_value":
        if (Q.values.length === 1) return `Ge\xE7ersiz de\u011Fer: beklenen ${S(Q.values[0])}`;
        return `Ge\xE7ersiz se\xE7enek: a\u015Fa\u011F\u0131dakilerden biri olmal\u0131: ${M(Q.values, "|")}`;
      case "too_big": {
        let Y = Q.inclusive ? "<=" : "<", W = X(Q.origin);
        if (W) return `\xC7ok b\xFCy\xFCk: beklenen ${Q.origin ?? "de\u011Fer"} ${Y}${Q.maximum.toString()} ${W.unit ?? "\xF6\u011Fe"}`;
        return `\xC7ok b\xFCy\xFCk: beklenen ${Q.origin ?? "de\u011Fer"} ${Y}${Q.maximum.toString()}`;
      }
      case "too_small": {
        let Y = Q.inclusive ? ">=" : ">", W = X(Q.origin);
        if (W) return `\xC7ok k\xFC\xE7\xFCk: beklenen ${Q.origin} ${Y}${Q.minimum.toString()} ${W.unit}`;
        return `\xC7ok k\xFC\xE7\xFCk: beklenen ${Q.origin} ${Y}${Q.minimum.toString()}`;
      }
      case "invalid_format": {
        let Y = Q;
        if (Y.format === "starts_with") return `Ge\xE7ersiz metin: "${Y.prefix}" ile ba\u015Flamal\u0131`;
        if (Y.format === "ends_with") return `Ge\xE7ersiz metin: "${Y.suffix}" ile bitmeli`;
        if (Y.format === "includes") return `Ge\xE7ersiz metin: "${Y.includes}" i\xE7ermeli`;
        if (Y.format === "regex") return `Ge\xE7ersiz metin: ${Y.pattern} desenine uymal\u0131`;
        return `Ge\xE7ersiz ${J[Y.format] ?? Q.format}`;
      }
      case "not_multiple_of":
        return `Ge\xE7ersiz say\u0131: ${Q.divisor} ile tam b\xF6l\xFCnebilmeli`;
      case "unrecognized_keys":
        return `Tan\u0131nmayan anahtar${Q.keys.length > 1 ? "lar" : ""}: ${M(Q.keys, ", ")}`;
      case "invalid_key":
        return `${Q.origin} i\xE7inde ge\xE7ersiz anahtar`;
      case "invalid_union":
        return "Ge\xE7ersiz de\u011Fer";
      case "invalid_element":
        return `${Q.origin} i\xE7inde ge\xE7ersiz de\u011Fer`;
      default:
        return "Ge\xE7ersiz de\u011Fer";
    }
  };
};
function q3() {
  return { localeError: Ob() };
}
var wb = () => {
  let $ = { string: { unit: "\u0441\u0438\u043C\u0432\u043E\u043B\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" }, file: { unit: "\u0431\u0430\u0439\u0442\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" }, array: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" }, set: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "\u0447\u0438\u0441\u043B\u043E";
      case "object": {
        if (Array.isArray(Y)) return "\u043C\u0430\u0441\u0438\u0432";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "\u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456", email: "\u0430\u0434\u0440\u0435\u0441\u0430 \u0435\u043B\u0435\u043A\u0442\u0440\u043E\u043D\u043D\u043E\u0457 \u043F\u043E\u0448\u0442\u0438", url: "URL", emoji: "\u0435\u043C\u043E\u0434\u0437\u0456", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "\u0434\u0430\u0442\u0430 \u0442\u0430 \u0447\u0430\u0441 ISO", date: "\u0434\u0430\u0442\u0430 ISO", time: "\u0447\u0430\u0441 ISO", duration: "\u0442\u0440\u0438\u0432\u0430\u043B\u0456\u0441\u0442\u044C ISO", ipv4: "\u0430\u0434\u0440\u0435\u0441\u0430 IPv4", ipv6: "\u0430\u0434\u0440\u0435\u0441\u0430 IPv6", cidrv4: "\u0434\u0456\u0430\u043F\u0430\u0437\u043E\u043D IPv4", cidrv6: "\u0434\u0456\u0430\u043F\u0430\u0437\u043E\u043D IPv6", base64: "\u0440\u044F\u0434\u043E\u043A \u0443 \u043A\u043E\u0434\u0443\u0432\u0430\u043D\u043D\u0456 base64", base64url: "\u0440\u044F\u0434\u043E\u043A \u0443 \u043A\u043E\u0434\u0443\u0432\u0430\u043D\u043D\u0456 base64url", json_string: "\u0440\u044F\u0434\u043E\u043A JSON", e164: "\u043D\u043E\u043C\u0435\u0440 E.164", jwt: "JWT", template_literal: "\u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F ${Y.expected}, \u043E\u0442\u0440\u0438\u043C\u0430\u043D\u043E ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F ${S(Y.values[0])}`;
        return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0430 \u043E\u043F\u0446\u0456\u044F: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F \u043E\u0434\u043D\u0435 \u0437 ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${Y.origin ?? "\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F"} ${z.verb} ${W}${Y.maximum.toString()} ${z.unit ?? "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432"}`;
        return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${Y.origin ?? "\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F"} \u0431\u0443\u0434\u0435 ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u043C\u0430\u043B\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${Y.origin} ${z.verb} ${W}${Y.minimum.toString()} ${z.unit}`;
        return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u043C\u0430\u043B\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${Y.origin} \u0431\u0443\u0434\u0435 ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u043F\u043E\u0447\u0438\u043D\u0430\u0442\u0438\u0441\u044F \u0437 "${W.prefix}"`;
        if (W.format === "ends_with") return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u0437\u0430\u043A\u0456\u043D\u0447\u0443\u0432\u0430\u0442\u0438\u0441\u044F \u043D\u0430 "${W.suffix}"`;
        if (W.format === "includes") return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u043C\u0456\u0441\u0442\u0438\u0442\u0438 "${W.includes}"`;
        if (W.format === "regex") return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0430\u0442\u0438 \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${W.pattern}`;
        return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0435 \u0447\u0438\u0441\u043B\u043E: \u043F\u043E\u0432\u0438\u043D\u043D\u043E \u0431\u0443\u0442\u0438 \u043A\u0440\u0430\u0442\u043D\u0438\u043C ${Y.divisor}`;
      case "unrecognized_keys":
        return `\u041D\u0435\u0440\u043E\u0437\u043F\u0456\u0437\u043D\u0430\u043D\u0438\u0439 \u043A\u043B\u044E\u0447${Y.keys.length > 1 ? "\u0456" : ""}: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u043A\u043B\u044E\u0447 \u0443 ${Y.origin}`;
      case "invalid_union":
        return "\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456";
      case "invalid_element":
        return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F \u0443 ${Y.origin}`;
      default:
        return "\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456";
    }
  };
};
function L3() {
  return { localeError: wb() };
}
var Bb = () => {
  let $ = { string: { unit: "\u062D\u0631\u0648\u0641", verb: "\u06C1\u0648\u0646\u0627" }, file: { unit: "\u0628\u0627\u0626\u0679\u0633", verb: "\u06C1\u0648\u0646\u0627" }, array: { unit: "\u0622\u0626\u0679\u0645\u0632", verb: "\u06C1\u0648\u0646\u0627" }, set: { unit: "\u0622\u0626\u0679\u0645\u0632", verb: "\u06C1\u0648\u0646\u0627" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "\u0646\u0645\u0628\u0631";
      case "object": {
        if (Array.isArray(Y)) return "\u0622\u0631\u06D2";
        if (Y === null) return "\u0646\u0644";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "\u0627\u0646 \u067E\u0679", email: "\u0627\u06CC \u0645\u06CC\u0644 \u0627\u06CC\u0688\u0631\u06CC\u0633", url: "\u06CC\u0648 \u0622\u0631 \u0627\u06CC\u0644", emoji: "\u0627\u06CC\u0645\u0648\u062C\u06CC", uuid: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC", uuidv4: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC \u0648\u06CC 4", uuidv6: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC \u0648\u06CC 6", nanoid: "\u0646\u06CC\u0646\u0648 \u0622\u0626\u06CC \u0688\u06CC", guid: "\u062C\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC", cuid: "\u0633\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC", cuid2: "\u0633\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC 2", ulid: "\u06CC\u0648 \u0627\u06CC\u0644 \u0622\u0626\u06CC \u0688\u06CC", xid: "\u0627\u06CC\u06A9\u0633 \u0622\u0626\u06CC \u0688\u06CC", ksuid: "\u06A9\u06D2 \u0627\u06CC\u0633 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC", datetime: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0688\u06CC\u0679 \u0679\u0627\u0626\u0645", date: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u062A\u0627\u0631\u06CC\u062E", time: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0648\u0642\u062A", duration: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0645\u062F\u062A", ipv4: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 4 \u0627\u06CC\u0688\u0631\u06CC\u0633", ipv6: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 6 \u0627\u06CC\u0688\u0631\u06CC\u0633", cidrv4: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 4 \u0631\u06CC\u0646\u062C", cidrv6: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 6 \u0631\u06CC\u0646\u062C", base64: "\u0628\u06CC\u0633 64 \u0627\u0646 \u06A9\u0648\u0688\u0688 \u0633\u0679\u0631\u0646\u06AF", base64url: "\u0628\u06CC\u0633 64 \u06CC\u0648 \u0622\u0631 \u0627\u06CC\u0644 \u0627\u0646 \u06A9\u0648\u0688\u0688 \u0633\u0679\u0631\u0646\u06AF", json_string: "\u062C\u06D2 \u0627\u06CC\u0633 \u0627\u0648 \u0627\u06CC\u0646 \u0633\u0679\u0631\u0646\u06AF", e164: "\u0627\u06CC 164 \u0646\u0645\u0628\u0631", jwt: "\u062C\u06D2 \u0688\u0628\u0644\u06CC\u0648 \u0679\u06CC", template_literal: "\u0627\u0646 \u067E\u0679" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679: ${Y.expected} \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627\u060C ${J(Y.input)} \u0645\u0648\u0635\u0648\u0644 \u06C1\u0648\u0627`;
      case "invalid_value":
        if (Y.values.length === 1) return `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679: ${S(Y.values[0])} \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
        return `\u063A\u0644\u0637 \u0622\u067E\u0634\u0646: ${M(Y.values, "|")} \u0645\u06CC\u06BA \u0633\u06D2 \u0627\u06CC\u06A9 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `\u0628\u06C1\u062A \u0628\u0691\u0627: ${Y.origin ?? "\u0648\u06CC\u0644\u06CC\u0648"} \u06A9\u06D2 ${W}${Y.maximum.toString()} ${z.unit ?? "\u0639\u0646\u0627\u0635\u0631"} \u06C1\u0648\u0646\u06D2 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u06D2`;
        return `\u0628\u06C1\u062A \u0628\u0691\u0627: ${Y.origin ?? "\u0648\u06CC\u0644\u06CC\u0648"} \u06A9\u0627 ${W}${Y.maximum.toString()} \u06C1\u0648\u0646\u0627 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `\u0628\u06C1\u062A \u0686\u06BE\u0648\u0679\u0627: ${Y.origin} \u06A9\u06D2 ${W}${Y.minimum.toString()} ${z.unit} \u06C1\u0648\u0646\u06D2 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u06D2`;
        return `\u0628\u06C1\u062A \u0686\u06BE\u0648\u0679\u0627: ${Y.origin} \u06A9\u0627 ${W}${Y.minimum.toString()} \u06C1\u0648\u0646\u0627 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${W.prefix}" \u0633\u06D2 \u0634\u0631\u0648\u0639 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
        if (W.format === "ends_with") return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${W.suffix}" \u067E\u0631 \u062E\u062A\u0645 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
        if (W.format === "includes") return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${W.includes}" \u0634\u0627\u0645\u0644 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
        if (W.format === "regex") return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: \u067E\u06CC\u0679\u0631\u0646 ${W.pattern} \u0633\u06D2 \u0645\u06CC\u0686 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
        return `\u063A\u0644\u0637 ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `\u063A\u0644\u0637 \u0646\u0645\u0628\u0631: ${Y.divisor} \u06A9\u0627 \u0645\u0636\u0627\u0639\u0641 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
      case "unrecognized_keys":
        return `\u063A\u06CC\u0631 \u062A\u0633\u0644\u06CC\u0645 \u0634\u062F\u06C1 \u06A9\u06CC${Y.keys.length > 1 ? "\u0632" : ""}: ${M(Y.keys, "\u060C ")}`;
      case "invalid_key":
        return `${Y.origin} \u0645\u06CC\u06BA \u063A\u0644\u0637 \u06A9\u06CC`;
      case "invalid_union":
        return "\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679";
      case "invalid_element":
        return `${Y.origin} \u0645\u06CC\u06BA \u063A\u0644\u0637 \u0648\u06CC\u0644\u06CC\u0648`;
      default:
        return "\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679";
    }
  };
};
function D3() {
  return { localeError: Bb() };
}
var qb = () => {
  let $ = { string: { unit: "k\xFD t\u1EF1", verb: "c\xF3" }, file: { unit: "byte", verb: "c\xF3" }, array: { unit: "ph\u1EA7n t\u1EED", verb: "c\xF3" }, set: { unit: "ph\u1EA7n t\u1EED", verb: "c\xF3" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "s\u1ED1";
      case "object": {
        if (Array.isArray(Y)) return "m\u1EA3ng";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "\u0111\u1EA7u v\xE0o", email: "\u0111\u1ECBa ch\u1EC9 email", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ng\xE0y gi\u1EDD ISO", date: "ng\xE0y ISO", time: "gi\u1EDD ISO", duration: "kho\u1EA3ng th\u1EDDi gian ISO", ipv4: "\u0111\u1ECBa ch\u1EC9 IPv4", ipv6: "\u0111\u1ECBa ch\u1EC9 IPv6", cidrv4: "d\u1EA3i IPv4", cidrv6: "d\u1EA3i IPv6", base64: "chu\u1ED7i m\xE3 h\xF3a base64", base64url: "chu\u1ED7i m\xE3 h\xF3a base64url", json_string: "chu\u1ED7i JSON", e164: "s\u1ED1 E.164", jwt: "JWT", template_literal: "\u0111\u1EA7u v\xE0o" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i ${Y.expected}, nh\u1EADn \u0111\u01B0\u1EE3c ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i ${S(Y.values[0])}`;
        return `T\xF9y ch\u1ECDn kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i m\u1ED9t trong c\xE1c gi\xE1 tr\u1ECB ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `Qu\xE1 l\u1EDBn: mong \u0111\u1EE3i ${Y.origin ?? "gi\xE1 tr\u1ECB"} ${z.verb} ${W}${Y.maximum.toString()} ${z.unit ?? "ph\u1EA7n t\u1EED"}`;
        return `Qu\xE1 l\u1EDBn: mong \u0111\u1EE3i ${Y.origin ?? "gi\xE1 tr\u1ECB"} ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `Qu\xE1 nh\u1ECF: mong \u0111\u1EE3i ${Y.origin} ${z.verb} ${W}${Y.minimum.toString()} ${z.unit}`;
        return `Qu\xE1 nh\u1ECF: mong \u0111\u1EE3i ${Y.origin} ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i b\u1EAFt \u0111\u1EA7u b\u1EB1ng "${W.prefix}"`;
        if (W.format === "ends_with") return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i k\u1EBFt th\xFAc b\u1EB1ng "${W.suffix}"`;
        if (W.format === "includes") return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i bao g\u1ED3m "${W.includes}"`;
        if (W.format === "regex") return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i kh\u1EDBp v\u1EDBi m\u1EABu ${W.pattern}`;
        return `${Q[W.format] ?? Y.format} kh\xF4ng h\u1EE3p l\u1EC7`;
      }
      case "not_multiple_of":
        return `S\u1ED1 kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i l\xE0 b\u1ED9i s\u1ED1 c\u1EE7a ${Y.divisor}`;
      case "unrecognized_keys":
        return `Kh\xF3a kh\xF4ng \u0111\u01B0\u1EE3c nh\u1EADn d\u1EA1ng: ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `Kh\xF3a kh\xF4ng h\u1EE3p l\u1EC7 trong ${Y.origin}`;
      case "invalid_union":
        return "\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7";
      case "invalid_element":
        return `Gi\xE1 tr\u1ECB kh\xF4ng h\u1EE3p l\u1EC7 trong ${Y.origin}`;
      default:
        return "\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7";
    }
  };
};
function j3() {
  return { localeError: qb() };
}
var Lb = () => {
  let $ = { string: { unit: "\u5B57\u7B26", verb: "\u5305\u542B" }, file: { unit: "\u5B57\u8282", verb: "\u5305\u542B" }, array: { unit: "\u9879", verb: "\u5305\u542B" }, set: { unit: "\u9879", verb: "\u5305\u542B" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "\u975E\u6570\u5B57(NaN)" : "\u6570\u5B57";
      case "object": {
        if (Array.isArray(Y)) return "\u6570\u7EC4";
        if (Y === null) return "\u7A7A\u503C(null)";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "\u8F93\u5165", email: "\u7535\u5B50\u90AE\u4EF6", url: "URL", emoji: "\u8868\u60C5\u7B26\u53F7", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO\u65E5\u671F\u65F6\u95F4", date: "ISO\u65E5\u671F", time: "ISO\u65F6\u95F4", duration: "ISO\u65F6\u957F", ipv4: "IPv4\u5730\u5740", ipv6: "IPv6\u5730\u5740", cidrv4: "IPv4\u7F51\u6BB5", cidrv6: "IPv6\u7F51\u6BB5", base64: "base64\u7F16\u7801\u5B57\u7B26\u4E32", base64url: "base64url\u7F16\u7801\u5B57\u7B26\u4E32", json_string: "JSON\u5B57\u7B26\u4E32", e164: "E.164\u53F7\u7801", jwt: "JWT", template_literal: "\u8F93\u5165" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B ${Y.expected}\uFF0C\u5B9E\u9645\u63A5\u6536 ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B ${S(Y.values[0])}`;
        return `\u65E0\u6548\u9009\u9879\uFF1A\u671F\u671B\u4EE5\u4E0B\u4E4B\u4E00 ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `\u6570\u503C\u8FC7\u5927\uFF1A\u671F\u671B ${Y.origin ?? "\u503C"} ${W}${Y.maximum.toString()} ${z.unit ?? "\u4E2A\u5143\u7D20"}`;
        return `\u6570\u503C\u8FC7\u5927\uFF1A\u671F\u671B ${Y.origin ?? "\u503C"} ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `\u6570\u503C\u8FC7\u5C0F\uFF1A\u671F\u671B ${Y.origin} ${W}${Y.minimum.toString()} ${z.unit}`;
        return `\u6570\u503C\u8FC7\u5C0F\uFF1A\u671F\u671B ${Y.origin} ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u4EE5 "${W.prefix}" \u5F00\u5934`;
        if (W.format === "ends_with") return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u4EE5 "${W.suffix}" \u7ED3\u5C3E`;
        if (W.format === "includes") return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u5305\u542B "${W.includes}"`;
        if (W.format === "regex") return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u6EE1\u8DB3\u6B63\u5219\u8868\u8FBE\u5F0F ${W.pattern}`;
        return `\u65E0\u6548${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `\u65E0\u6548\u6570\u5B57\uFF1A\u5FC5\u987B\u662F ${Y.divisor} \u7684\u500D\u6570`;
      case "unrecognized_keys":
        return `\u51FA\u73B0\u672A\u77E5\u7684\u952E(key): ${M(Y.keys, ", ")}`;
      case "invalid_key":
        return `${Y.origin} \u4E2D\u7684\u952E(key)\u65E0\u6548`;
      case "invalid_union":
        return "\u65E0\u6548\u8F93\u5165";
      case "invalid_element":
        return `${Y.origin} \u4E2D\u5305\u542B\u65E0\u6548\u503C(value)`;
      default:
        return "\u65E0\u6548\u8F93\u5165";
    }
  };
};
function F3() {
  return { localeError: Lb() };
}
var Db = () => {
  let $ = { string: { unit: "\u5B57\u5143", verb: "\u64C1\u6709" }, file: { unit: "\u4F4D\u5143\u7D44", verb: "\u64C1\u6709" }, array: { unit: "\u9805\u76EE", verb: "\u64C1\u6709" }, set: { unit: "\u9805\u76EE", verb: "\u64C1\u6709" } };
  function X(Y) {
    return $[Y] ?? null;
  }
  let J = (Y) => {
    let W = typeof Y;
    switch (W) {
      case "number":
        return Number.isNaN(Y) ? "NaN" : "number";
      case "object": {
        if (Array.isArray(Y)) return "array";
        if (Y === null) return "null";
        if (Object.getPrototypeOf(Y) !== Object.prototype && Y.constructor) return Y.constructor.name;
      }
    }
    return W;
  }, Q = { regex: "\u8F38\u5165", email: "\u90F5\u4EF6\u5730\u5740", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO \u65E5\u671F\u6642\u9593", date: "ISO \u65E5\u671F", time: "ISO \u6642\u9593", duration: "ISO \u671F\u9593", ipv4: "IPv4 \u4F4D\u5740", ipv6: "IPv6 \u4F4D\u5740", cidrv4: "IPv4 \u7BC4\u570D", cidrv6: "IPv6 \u7BC4\u570D", base64: "base64 \u7DE8\u78BC\u5B57\u4E32", base64url: "base64url \u7DE8\u78BC\u5B57\u4E32", json_string: "JSON \u5B57\u4E32", e164: "E.164 \u6578\u503C", jwt: "JWT", template_literal: "\u8F38\u5165" };
  return (Y) => {
    switch (Y.code) {
      case "invalid_type":
        return `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA ${Y.expected}\uFF0C\u4F46\u6536\u5230 ${J(Y.input)}`;
      case "invalid_value":
        if (Y.values.length === 1) return `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA ${S(Y.values[0])}`;
        return `\u7121\u6548\u7684\u9078\u9805\uFF1A\u9810\u671F\u70BA\u4EE5\u4E0B\u5176\u4E2D\u4E4B\u4E00 ${M(Y.values, "|")}`;
      case "too_big": {
        let W = Y.inclusive ? "<=" : "<", z = X(Y.origin);
        if (z) return `\u6578\u503C\u904E\u5927\uFF1A\u9810\u671F ${Y.origin ?? "\u503C"} \u61C9\u70BA ${W}${Y.maximum.toString()} ${z.unit ?? "\u500B\u5143\u7D20"}`;
        return `\u6578\u503C\u904E\u5927\uFF1A\u9810\u671F ${Y.origin ?? "\u503C"} \u61C9\u70BA ${W}${Y.maximum.toString()}`;
      }
      case "too_small": {
        let W = Y.inclusive ? ">=" : ">", z = X(Y.origin);
        if (z) return `\u6578\u503C\u904E\u5C0F\uFF1A\u9810\u671F ${Y.origin} \u61C9\u70BA ${W}${Y.minimum.toString()} ${z.unit}`;
        return `\u6578\u503C\u904E\u5C0F\uFF1A\u9810\u671F ${Y.origin} \u61C9\u70BA ${W}${Y.minimum.toString()}`;
      }
      case "invalid_format": {
        let W = Y;
        if (W.format === "starts_with") return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u4EE5 "${W.prefix}" \u958B\u982D`;
        if (W.format === "ends_with") return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u4EE5 "${W.suffix}" \u7D50\u5C3E`;
        if (W.format === "includes") return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u5305\u542B "${W.includes}"`;
        if (W.format === "regex") return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u7B26\u5408\u683C\u5F0F ${W.pattern}`;
        return `\u7121\u6548\u7684 ${Q[W.format] ?? Y.format}`;
      }
      case "not_multiple_of":
        return `\u7121\u6548\u7684\u6578\u5B57\uFF1A\u5FC5\u9808\u70BA ${Y.divisor} \u7684\u500D\u6578`;
      case "unrecognized_keys":
        return `\u7121\u6CD5\u8B58\u5225\u7684\u9375\u503C${Y.keys.length > 1 ? "\u5011" : ""}\uFF1A${M(Y.keys, "\u3001")}`;
      case "invalid_key":
        return `${Y.origin} \u4E2D\u6709\u7121\u6548\u7684\u9375\u503C`;
      case "invalid_union":
        return "\u7121\u6548\u7684\u8F38\u5165\u503C";
      case "invalid_element":
        return `${Y.origin} \u4E2D\u6709\u7121\u6548\u7684\u503C`;
      default:
        return "\u7121\u6548\u7684\u8F38\u5165\u503C";
    }
  };
};
function M3() {
  return { localeError: Db() };
}
var L7 = Symbol("ZodOutput");
var D7 = Symbol("ZodInput");
var fX = class {
  constructor() {
    this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map();
  }
  add($, ...X) {
    let J = X[0];
    if (this._map.set($, J), J && typeof J === "object" && "id" in J) {
      if (this._idmap.has(J.id)) throw Error(`ID ${J.id} already exists in the registry`);
      this._idmap.set(J.id, $);
    }
    return this;
  }
  remove($) {
    return this._map.delete($), this;
  }
  get($) {
    let X = $._zod.parent;
    if (X) {
      let J = { ...this.get(X) ?? {} };
      return delete J.id, { ...J, ...this._map.get($) };
    }
    return this._map.get($);
  }
  has($) {
    return this._map.has($);
  }
};
function gX() {
  return new fX();
}
var G6 = gX();
function j7($, X) {
  return new $({ type: "string", ...P(X) });
}
function A3($, X) {
  return new $({ type: "string", coerce: true, ...P(X) });
}
function hX($, X) {
  return new $({ type: "string", format: "email", check: "string_format", abort: false, ...P(X) });
}
function x0($, X) {
  return new $({ type: "string", format: "guid", check: "string_format", abort: false, ...P(X) });
}
function uX($, X) {
  return new $({ type: "string", format: "uuid", check: "string_format", abort: false, ...P(X) });
}
function mX($, X) {
  return new $({ type: "string", format: "uuid", check: "string_format", abort: false, version: "v4", ...P(X) });
}
function lX($, X) {
  return new $({ type: "string", format: "uuid", check: "string_format", abort: false, version: "v6", ...P(X) });
}
function cX($, X) {
  return new $({ type: "string", format: "uuid", check: "string_format", abort: false, version: "v7", ...P(X) });
}
function pX($, X) {
  return new $({ type: "string", format: "url", check: "string_format", abort: false, ...P(X) });
}
function dX($, X) {
  return new $({ type: "string", format: "emoji", check: "string_format", abort: false, ...P(X) });
}
function iX($, X) {
  return new $({ type: "string", format: "nanoid", check: "string_format", abort: false, ...P(X) });
}
function nX($, X) {
  return new $({ type: "string", format: "cuid", check: "string_format", abort: false, ...P(X) });
}
function rX($, X) {
  return new $({ type: "string", format: "cuid2", check: "string_format", abort: false, ...P(X) });
}
function oX($, X) {
  return new $({ type: "string", format: "ulid", check: "string_format", abort: false, ...P(X) });
}
function tX($, X) {
  return new $({ type: "string", format: "xid", check: "string_format", abort: false, ...P(X) });
}
function aX($, X) {
  return new $({ type: "string", format: "ksuid", check: "string_format", abort: false, ...P(X) });
}
function sX($, X) {
  return new $({ type: "string", format: "ipv4", check: "string_format", abort: false, ...P(X) });
}
function eX($, X) {
  return new $({ type: "string", format: "ipv6", check: "string_format", abort: false, ...P(X) });
}
function $9($, X) {
  return new $({ type: "string", format: "cidrv4", check: "string_format", abort: false, ...P(X) });
}
function X9($, X) {
  return new $({ type: "string", format: "cidrv6", check: "string_format", abort: false, ...P(X) });
}
function J9($, X) {
  return new $({ type: "string", format: "base64", check: "string_format", abort: false, ...P(X) });
}
function Y9($, X) {
  return new $({ type: "string", format: "base64url", check: "string_format", abort: false, ...P(X) });
}
function Q9($, X) {
  return new $({ type: "string", format: "e164", check: "string_format", abort: false, ...P(X) });
}
function W9($, X) {
  return new $({ type: "string", format: "jwt", check: "string_format", abort: false, ...P(X) });
}
var F7 = { Any: null, Minute: -1, Second: 0, Millisecond: 3, Microsecond: 6 };
function I3($, X) {
  return new $({ type: "string", format: "datetime", check: "string_format", offset: false, local: false, precision: null, ...P(X) });
}
function b3($, X) {
  return new $({ type: "string", format: "date", check: "string_format", ...P(X) });
}
function Z3($, X) {
  return new $({ type: "string", format: "time", check: "string_format", precision: null, ...P(X) });
}
function P3($, X) {
  return new $({ type: "string", format: "duration", check: "string_format", ...P(X) });
}
function M7($, X) {
  return new $({ type: "number", checks: [], ...P(X) });
}
function R3($, X) {
  return new $({ type: "number", coerce: true, checks: [], ...P(X) });
}
function A7($, X) {
  return new $({ type: "number", check: "number_format", abort: false, format: "safeint", ...P(X) });
}
function I7($, X) {
  return new $({ type: "number", check: "number_format", abort: false, format: "float32", ...P(X) });
}
function b7($, X) {
  return new $({ type: "number", check: "number_format", abort: false, format: "float64", ...P(X) });
}
function Z7($, X) {
  return new $({ type: "number", check: "number_format", abort: false, format: "int32", ...P(X) });
}
function P7($, X) {
  return new $({ type: "number", check: "number_format", abort: false, format: "uint32", ...P(X) });
}
function R7($, X) {
  return new $({ type: "boolean", ...P(X) });
}
function E3($, X) {
  return new $({ type: "boolean", coerce: true, ...P(X) });
}
function E7($, X) {
  return new $({ type: "bigint", ...P(X) });
}
function S3($, X) {
  return new $({ type: "bigint", coerce: true, ...P(X) });
}
function S7($, X) {
  return new $({ type: "bigint", check: "bigint_format", abort: false, format: "int64", ...P(X) });
}
function v7($, X) {
  return new $({ type: "bigint", check: "bigint_format", abort: false, format: "uint64", ...P(X) });
}
function C7($, X) {
  return new $({ type: "symbol", ...P(X) });
}
function k7($, X) {
  return new $({ type: "undefined", ...P(X) });
}
function _7($, X) {
  return new $({ type: "null", ...P(X) });
}
function x7($) {
  return new $({ type: "any" });
}
function k1($) {
  return new $({ type: "unknown" });
}
function T7($, X) {
  return new $({ type: "never", ...P(X) });
}
function y7($, X) {
  return new $({ type: "void", ...P(X) });
}
function f7($, X) {
  return new $({ type: "date", ...P(X) });
}
function v3($, X) {
  return new $({ type: "date", coerce: true, ...P(X) });
}
function g7($, X) {
  return new $({ type: "nan", ...P(X) });
}
function j4($, X) {
  return new qY({ check: "less_than", ...P(X), value: $, inclusive: false });
}
function b6($, X) {
  return new qY({ check: "less_than", ...P(X), value: $, inclusive: true });
}
function F4($, X) {
  return new LY({ check: "greater_than", ...P(X), value: $, inclusive: false });
}
function U6($, X) {
  return new LY({ check: "greater_than", ...P(X), value: $, inclusive: true });
}
function C3($) {
  return F4(0, $);
}
function k3($) {
  return j4(0, $);
}
function _3($) {
  return b6(0, $);
}
function x3($) {
  return U6(0, $);
}
function _1($, X) {
  return new Oz({ check: "multiple_of", ...P(X), value: $ });
}
function T0($, X) {
  return new qz({ check: "max_size", ...P(X), maximum: $ });
}
function x1($, X) {
  return new Lz({ check: "min_size", ...P(X), minimum: $ });
}
function z9($, X) {
  return new Dz({ check: "size_equals", ...P(X), size: $ });
}
function y0($, X) {
  return new jz({ check: "max_length", ...P(X), maximum: $ });
}
function n4($, X) {
  return new Fz({ check: "min_length", ...P(X), minimum: $ });
}
function f0($, X) {
  return new Mz({ check: "length_equals", ...P(X), length: $ });
}
function G9($, X) {
  return new Az({ check: "string_format", format: "regex", ...P(X), pattern: $ });
}
function U9($) {
  return new Iz({ check: "string_format", format: "lowercase", ...P($) });
}
function H9($) {
  return new bz({ check: "string_format", format: "uppercase", ...P($) });
}
function K9($, X) {
  return new Zz({ check: "string_format", format: "includes", ...P(X), includes: $ });
}
function V9($, X) {
  return new Pz({ check: "string_format", format: "starts_with", ...P(X), prefix: $ });
}
function N9($, X) {
  return new Rz({ check: "string_format", format: "ends_with", ...P(X), suffix: $ });
}
function T3($, X, J) {
  return new Ez({ check: "property", property: $, schema: X, ...P(J) });
}
function O9($, X) {
  return new Sz({ check: "mime_type", mime: $, ...P(X) });
}
function M4($) {
  return new vz({ check: "overwrite", tx: $ });
}
function w9($) {
  return M4((X) => X.normalize($));
}
function B9() {
  return M4(($) => $.trim());
}
function q9() {
  return M4(($) => $.toLowerCase());
}
function L9() {
  return M4(($) => $.toUpperCase());
}
function D9($, X, J) {
  return new $({ type: "array", element: X, ...P(J) });
}
function jb($, X, J) {
  return new $({ type: "union", options: X, ...P(J) });
}
function Fb($, X, J, Q) {
  return new $({ type: "union", options: J, discriminator: X, ...P(Q) });
}
function Mb($, X, J) {
  return new $({ type: "intersection", left: X, right: J });
}
function y3($, X, J, Q) {
  let Y = J instanceof d;
  return new $({ type: "tuple", items: X, rest: Y ? J : null, ...P(Y ? Q : J) });
}
function Ab($, X, J, Q) {
  return new $({ type: "record", keyType: X, valueType: J, ...P(Q) });
}
function Ib($, X, J, Q) {
  return new $({ type: "map", keyType: X, valueType: J, ...P(Q) });
}
function bb($, X, J) {
  return new $({ type: "set", valueType: X, ...P(J) });
}
function Zb($, X, J) {
  let Q = Array.isArray(X) ? Object.fromEntries(X.map((Y) => [Y, Y])) : X;
  return new $({ type: "enum", entries: Q, ...P(J) });
}
function Pb($, X, J) {
  return new $({ type: "enum", entries: X, ...P(J) });
}
function Rb($, X, J) {
  return new $({ type: "literal", values: Array.isArray(X) ? X : [X], ...P(J) });
}
function h7($, X) {
  return new $({ type: "file", ...P(X) });
}
function Eb($, X) {
  return new $({ type: "transform", transform: X });
}
function Sb($, X) {
  return new $({ type: "optional", innerType: X });
}
function vb($, X) {
  return new $({ type: "nullable", innerType: X });
}
function Cb($, X, J) {
  return new $({ type: "default", innerType: X, get defaultValue() {
    return typeof J === "function" ? J() : J;
  } });
}
function kb($, X, J) {
  return new $({ type: "nonoptional", innerType: X, ...P(J) });
}
function _b($, X) {
  return new $({ type: "success", innerType: X });
}
function xb($, X, J) {
  return new $({ type: "catch", innerType: X, catchValue: typeof J === "function" ? J : () => J });
}
function Tb($, X, J) {
  return new $({ type: "pipe", in: X, out: J });
}
function yb($, X) {
  return new $({ type: "readonly", innerType: X });
}
function fb($, X, J) {
  return new $({ type: "template_literal", parts: X, ...P(J) });
}
function gb($, X) {
  return new $({ type: "lazy", getter: X });
}
function hb($, X) {
  return new $({ type: "promise", innerType: X });
}
function u7($, X, J) {
  let Q = P(J);
  return Q.abort ?? (Q.abort = true), new $({ type: "custom", check: "custom", fn: X, ...Q });
}
function m7($, X, J) {
  return new $({ type: "custom", check: "custom", fn: X, ...P(J) });
}
function l7($, X) {
  let J = P(X), Q = J.truthy ?? ["true", "1", "yes", "on", "y", "enabled"], Y = J.falsy ?? ["false", "0", "no", "off", "n", "disabled"];
  if (J.case !== "sensitive") Q = Q.map((w) => typeof w === "string" ? w.toLowerCase() : w), Y = Y.map((w) => typeof w === "string" ? w.toLowerCase() : w);
  let W = new Set(Q), z = new Set(Y), G = $.Pipe ?? k0, U = $.Boolean ?? S0, H = $.String ?? d4, V = new ($.Transform ?? C0)({ type: "transform", transform: (w, B) => {
    let D = w;
    if (J.case !== "sensitive") D = D.toLowerCase();
    if (W.has(D)) return true;
    else if (z.has(D)) return false;
    else return B.issues.push({ code: "invalid_value", expected: "stringbool", values: [...W, ...z], input: B.value, inst: V }), {};
  }, error: J.error }), N = new G({ type: "pipe", in: new H({ type: "string", error: J.error }), out: V, error: J.error });
  return new G({ type: "pipe", in: N, out: new U({ type: "boolean", error: J.error }), error: J.error });
}
function c7($, X, J, Q = {}) {
  let Y = P(Q), W = { ...P(Q), check: "string_format", type: "string", format: X, fn: typeof J === "function" ? J : (G) => J.test(G), ...Y };
  if (J instanceof RegExp) W.pattern = J;
  return new $(W);
}
var f3 = class {
  constructor($) {
    this._def = $, this.def = $;
  }
  implement($) {
    if (typeof $ !== "function") throw Error("implement() must be called with a function");
    let X = (...J) => {
      let Q = this._def.input ? E1(this._def.input, J, void 0, { callee: X }) : J;
      if (!Array.isArray(Q)) throw Error("Invalid arguments schema: not an array or tuple schema.");
      let Y = $(...Q);
      return this._def.output ? E1(this._def.output, Y, void 0, { callee: X }) : Y;
    };
    return X;
  }
  implementAsync($) {
    if (typeof $ !== "function") throw Error("implement() must be called with a function");
    let X = async (...J) => {
      let Q = this._def.input ? await S1(this._def.input, J, void 0, { callee: X }) : J;
      if (!Array.isArray(Q)) throw Error("Invalid arguments schema: not an array or tuple schema.");
      let Y = await $(...Q);
      return this._def.output ? S1(this._def.output, Y, void 0, { callee: X }) : Y;
    };
    return X;
  }
  input(...$) {
    let X = this.constructor;
    if (Array.isArray($[0])) return new X({ type: "function", input: new i4({ type: "tuple", items: $[0], rest: $[1] }), output: this._def.output });
    return new X({ type: "function", input: $[0], output: this._def.output });
  }
  output($) {
    return new this.constructor({ type: "function", input: this._def.input, output: $ });
  }
};
function p7($) {
  return new f3({ type: "function", input: Array.isArray($?.input) ? y3(i4, $?.input) : $?.input ?? D9(v0, k1(C1)), output: $?.output ?? k1(C1) });
}
var d7 = class {
  constructor($) {
    this.counter = 0, this.metadataRegistry = $?.metadata ?? G6, this.target = $?.target ?? "draft-2020-12", this.unrepresentable = $?.unrepresentable ?? "throw", this.override = $?.override ?? (() => {
    }), this.io = $?.io ?? "output", this.seen = /* @__PURE__ */ new Map();
  }
  process($, X = { path: [], schemaPath: [] }) {
    var J;
    let Q = $._zod.def, Y = { guid: "uuid", url: "uri", datetime: "date-time", json_string: "json-string", regex: "" }, W = this.seen.get($);
    if (W) {
      if (W.count++, X.schemaPath.includes($)) W.cycle = X.path;
      return W.schema;
    }
    let z = { schema: {}, count: 1, cycle: void 0, path: X.path };
    this.seen.set($, z);
    let G = $._zod.toJSONSchema?.();
    if (G) z.schema = G;
    else {
      let K = { ...X, schemaPath: [...X.schemaPath, $], path: X.path }, V = $._zod.parent;
      if (V) z.ref = V, this.process(V, K), this.seen.get(V).isParent = true;
      else {
        let N = z.schema;
        switch (Q.type) {
          case "string": {
            let O = N;
            O.type = "string";
            let { minimum: w, maximum: B, format: D, patterns: j, contentEncoding: A } = $._zod.bag;
            if (typeof w === "number") O.minLength = w;
            if (typeof B === "number") O.maxLength = B;
            if (D) {
              if (O.format = Y[D] ?? D, O.format === "") delete O.format;
            }
            if (A) O.contentEncoding = A;
            if (j && j.size > 0) {
              let I = [...j];
              if (I.length === 1) O.pattern = I[0].source;
              else if (I.length > 1) z.schema.allOf = [...I.map((x) => ({ ...this.target === "draft-7" ? { type: "string" } : {}, pattern: x.source }))];
            }
            break;
          }
          case "number": {
            let O = N, { minimum: w, maximum: B, format: D, multipleOf: j, exclusiveMaximum: A, exclusiveMinimum: I } = $._zod.bag;
            if (typeof D === "string" && D.includes("int")) O.type = "integer";
            else O.type = "number";
            if (typeof I === "number") O.exclusiveMinimum = I;
            if (typeof w === "number") {
              if (O.minimum = w, typeof I === "number") if (I >= w) delete O.minimum;
              else delete O.exclusiveMinimum;
            }
            if (typeof A === "number") O.exclusiveMaximum = A;
            if (typeof B === "number") {
              if (O.maximum = B, typeof A === "number") if (A <= B) delete O.maximum;
              else delete O.exclusiveMaximum;
            }
            if (typeof j === "number") O.multipleOf = j;
            break;
          }
          case "boolean": {
            let O = N;
            O.type = "boolean";
            break;
          }
          case "bigint": {
            if (this.unrepresentable === "throw") throw Error("BigInt cannot be represented in JSON Schema");
            break;
          }
          case "symbol": {
            if (this.unrepresentable === "throw") throw Error("Symbols cannot be represented in JSON Schema");
            break;
          }
          case "null": {
            N.type = "null";
            break;
          }
          case "any":
            break;
          case "unknown":
            break;
          case "undefined":
          case "never": {
            N.not = {};
            break;
          }
          case "void": {
            if (this.unrepresentable === "throw") throw Error("Void cannot be represented in JSON Schema");
            break;
          }
          case "date": {
            if (this.unrepresentable === "throw") throw Error("Date cannot be represented in JSON Schema");
            break;
          }
          case "array": {
            let O = N, { minimum: w, maximum: B } = $._zod.bag;
            if (typeof w === "number") O.minItems = w;
            if (typeof B === "number") O.maxItems = B;
            O.type = "array", O.items = this.process(Q.element, { ...K, path: [...K.path, "items"] });
            break;
          }
          case "object": {
            let O = N;
            O.type = "object", O.properties = {};
            let w = Q.shape;
            for (let j in w) O.properties[j] = this.process(w[j], { ...K, path: [...K.path, "properties", j] });
            let B = new Set(Object.keys(w)), D = new Set([...B].filter((j) => {
              let A = Q.shape[j]._zod;
              if (this.io === "input") return A.optin === void 0;
              else return A.optout === void 0;
            }));
            if (D.size > 0) O.required = Array.from(D);
            if (Q.catchall?._zod.def.type === "never") O.additionalProperties = false;
            else if (!Q.catchall) {
              if (this.io === "output") O.additionalProperties = false;
            } else if (Q.catchall) O.additionalProperties = this.process(Q.catchall, { ...K, path: [...K.path, "additionalProperties"] });
            break;
          }
          case "union": {
            let O = N;
            O.anyOf = Q.options.map((w, B) => this.process(w, { ...K, path: [...K.path, "anyOf", B] }));
            break;
          }
          case "intersection": {
            let O = N, w = this.process(Q.left, { ...K, path: [...K.path, "allOf", 0] }), B = this.process(Q.right, { ...K, path: [...K.path, "allOf", 1] }), D = (A) => "allOf" in A && Object.keys(A).length === 1, j = [...D(w) ? w.allOf : [w], ...D(B) ? B.allOf : [B]];
            O.allOf = j;
            break;
          }
          case "tuple": {
            let O = N;
            O.type = "array";
            let w = Q.items.map((j, A) => this.process(j, { ...K, path: [...K.path, "prefixItems", A] }));
            if (this.target === "draft-2020-12") O.prefixItems = w;
            else O.items = w;
            if (Q.rest) {
              let j = this.process(Q.rest, { ...K, path: [...K.path, "items"] });
              if (this.target === "draft-2020-12") O.items = j;
              else O.additionalItems = j;
            }
            if (Q.rest) O.items = this.process(Q.rest, { ...K, path: [...K.path, "items"] });
            let { minimum: B, maximum: D } = $._zod.bag;
            if (typeof B === "number") O.minItems = B;
            if (typeof D === "number") O.maxItems = D;
            break;
          }
          case "record": {
            let O = N;
            O.type = "object", O.propertyNames = this.process(Q.keyType, { ...K, path: [...K.path, "propertyNames"] }), O.additionalProperties = this.process(Q.valueType, { ...K, path: [...K.path, "additionalProperties"] });
            break;
          }
          case "map": {
            if (this.unrepresentable === "throw") throw Error("Map cannot be represented in JSON Schema");
            break;
          }
          case "set": {
            if (this.unrepresentable === "throw") throw Error("Set cannot be represented in JSON Schema");
            break;
          }
          case "enum": {
            let O = N, w = ZX(Q.entries);
            if (w.every((B) => typeof B === "number")) O.type = "number";
            if (w.every((B) => typeof B === "string")) O.type = "string";
            O.enum = w;
            break;
          }
          case "literal": {
            let O = N, w = [];
            for (let B of Q.values) if (B === void 0) {
              if (this.unrepresentable === "throw") throw Error("Literal `undefined` cannot be represented in JSON Schema");
            } else if (typeof B === "bigint") if (this.unrepresentable === "throw") throw Error("BigInt literals cannot be represented in JSON Schema");
            else w.push(Number(B));
            else w.push(B);
            if (w.length === 0) ;
            else if (w.length === 1) {
              let B = w[0];
              O.type = B === null ? "null" : typeof B, O.const = B;
            } else {
              if (w.every((B) => typeof B === "number")) O.type = "number";
              if (w.every((B) => typeof B === "string")) O.type = "string";
              if (w.every((B) => typeof B === "boolean")) O.type = "string";
              if (w.every((B) => B === null)) O.type = "null";
              O.enum = w;
            }
            break;
          }
          case "file": {
            let O = N, w = { type: "string", format: "binary", contentEncoding: "binary" }, { minimum: B, maximum: D, mime: j } = $._zod.bag;
            if (B !== void 0) w.minLength = B;
            if (D !== void 0) w.maxLength = D;
            if (j) if (j.length === 1) w.contentMediaType = j[0], Object.assign(O, w);
            else O.anyOf = j.map((A) => {
              return { ...w, contentMediaType: A };
            });
            else Object.assign(O, w);
            break;
          }
          case "transform": {
            if (this.unrepresentable === "throw") throw Error("Transforms cannot be represented in JSON Schema");
            break;
          }
          case "nullable": {
            let O = this.process(Q.innerType, K);
            N.anyOf = [O, { type: "null" }];
            break;
          }
          case "nonoptional": {
            this.process(Q.innerType, K), z.ref = Q.innerType;
            break;
          }
          case "success": {
            let O = N;
            O.type = "boolean";
            break;
          }
          case "default": {
            this.process(Q.innerType, K), z.ref = Q.innerType, N.default = JSON.parse(JSON.stringify(Q.defaultValue));
            break;
          }
          case "prefault": {
            if (this.process(Q.innerType, K), z.ref = Q.innerType, this.io === "input") N._prefault = JSON.parse(JSON.stringify(Q.defaultValue));
            break;
          }
          case "catch": {
            this.process(Q.innerType, K), z.ref = Q.innerType;
            let O;
            try {
              O = Q.catchValue(void 0);
            } catch {
              throw Error("Dynamic catch values are not supported in JSON Schema");
            }
            N.default = O;
            break;
          }
          case "nan": {
            if (this.unrepresentable === "throw") throw Error("NaN cannot be represented in JSON Schema");
            break;
          }
          case "template_literal": {
            let O = N, w = $._zod.pattern;
            if (!w) throw Error("Pattern not found in template literal");
            O.type = "string", O.pattern = w.source;
            break;
          }
          case "pipe": {
            let O = this.io === "input" ? Q.in._zod.def.type === "transform" ? Q.out : Q.in : Q.out;
            this.process(O, K), z.ref = O;
            break;
          }
          case "readonly": {
            this.process(Q.innerType, K), z.ref = Q.innerType, N.readOnly = true;
            break;
          }
          case "promise": {
            this.process(Q.innerType, K), z.ref = Q.innerType;
            break;
          }
          case "optional": {
            this.process(Q.innerType, K), z.ref = Q.innerType;
            break;
          }
          case "lazy": {
            let O = $._zod.innerType;
            this.process(O, K), z.ref = O;
            break;
          }
          case "custom": {
            if (this.unrepresentable === "throw") throw Error("Custom types cannot be represented in JSON Schema");
            break;
          }
          default:
        }
      }
    }
    let U = this.metadataRegistry.get($);
    if (U) Object.assign(z.schema, U);
    if (this.io === "input" && _$($)) delete z.schema.examples, delete z.schema.default;
    if (this.io === "input" && z.schema._prefault) (J = z.schema).default ?? (J.default = z.schema._prefault);
    return delete z.schema._prefault, this.seen.get($).schema;
  }
  emit($, X) {
    let J = { cycles: X?.cycles ?? "ref", reused: X?.reused ?? "inline", external: X?.external ?? void 0 }, Q = this.seen.get($);
    if (!Q) throw Error("Unprocessed schema. This is a bug in Zod.");
    let Y = (H) => {
      let K = this.target === "draft-2020-12" ? "$defs" : "definitions";
      if (J.external) {
        let w = J.external.registry.get(H[0])?.id;
        if (w) return { ref: J.external.uri(w) };
        let B = H[1].defId ?? H[1].schema.id ?? `schema${this.counter++}`;
        return H[1].defId = B, { defId: B, ref: `${J.external.uri("__shared")}#/${K}/${B}` };
      }
      if (H[1] === Q) return { ref: "#" };
      let N = `${"#"}/${K}/`, O = H[1].schema.id ?? `__schema${this.counter++}`;
      return { defId: O, ref: N + O };
    }, W = (H) => {
      if (H[1].schema.$ref) return;
      let K = H[1], { ref: V, defId: N } = Y(H);
      if (K.def = { ...K.schema }, N) K.defId = N;
      let O = K.schema;
      for (let w in O) delete O[w];
      O.$ref = V;
    };
    for (let H of this.seen.entries()) {
      let K = H[1];
      if ($ === H[0]) {
        W(H);
        continue;
      }
      if (J.external) {
        let N = J.external.registry.get(H[0])?.id;
        if ($ !== H[0] && N) {
          W(H);
          continue;
        }
      }
      if (this.metadataRegistry.get(H[0])?.id) {
        W(H);
        continue;
      }
      if (K.cycle) {
        if (J.cycles === "throw") throw Error(`Cycle detected: #/${K.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
        else if (J.cycles === "ref") W(H);
        continue;
      }
      if (K.count > 1) {
        if (J.reused === "ref") {
          W(H);
          continue;
        }
      }
    }
    let z = (H, K) => {
      let V = this.seen.get(H), N = V.def ?? V.schema, O = { ...N };
      if (V.ref === null) return;
      let w = V.ref;
      if (V.ref = null, w) {
        z(w, K);
        let B = this.seen.get(w).schema;
        if (B.$ref && K.target === "draft-7") N.allOf = N.allOf ?? [], N.allOf.push(B);
        else Object.assign(N, B), Object.assign(N, O);
      }
      if (!V.isParent) this.override({ zodSchema: H, jsonSchema: N, path: V.path ?? [] });
    };
    for (let H of [...this.seen.entries()].reverse()) z(H[0], { target: this.target });
    let G = {};
    if (this.target === "draft-2020-12") G.$schema = "https://json-schema.org/draft/2020-12/schema";
    else if (this.target === "draft-7") G.$schema = "http://json-schema.org/draft-07/schema#";
    else console.warn(`Invalid target: ${this.target}`);
    Object.assign(G, Q.def);
    let U = J.external?.defs ?? {};
    for (let H of this.seen.entries()) {
      let K = H[1];
      if (K.def && K.defId) U[K.defId] = K.def;
    }
    if (!J.external && Object.keys(U).length > 0) if (this.target === "draft-2020-12") G.$defs = U;
    else G.definitions = U;
    try {
      return JSON.parse(JSON.stringify(G));
    } catch (H) {
      throw Error("Error converting schema to JSON.");
    }
  }
};
function g0($, X) {
  if ($ instanceof fX) {
    let Q = new d7(X), Y = {};
    for (let G of $._idmap.entries()) {
      let [U, H] = G;
      Q.process(H);
    }
    let W = {}, z = { registry: $, uri: X?.uri || ((G) => G), defs: Y };
    for (let G of $._idmap.entries()) {
      let [U, H] = G;
      W[U] = Q.emit(H, { ...X, external: z });
    }
    if (Object.keys(Y).length > 0) {
      let G = Q.target === "draft-2020-12" ? "$defs" : "definitions";
      W.__shared = { [G]: Y };
    }
    return { schemas: W };
  }
  let J = new d7(X);
  return J.process($), J.emit($, X);
}
function _$($, X) {
  let J = X ?? { seen: /* @__PURE__ */ new Set() };
  if (J.seen.has($)) return false;
  J.seen.add($);
  let Y = $._zod.def;
  switch (Y.type) {
    case "string":
    case "number":
    case "bigint":
    case "boolean":
    case "date":
    case "symbol":
    case "undefined":
    case "null":
    case "any":
    case "unknown":
    case "never":
    case "void":
    case "literal":
    case "enum":
    case "nan":
    case "file":
    case "template_literal":
      return false;
    case "array":
      return _$(Y.element, J);
    case "object": {
      for (let W in Y.shape) if (_$(Y.shape[W], J)) return true;
      return false;
    }
    case "union": {
      for (let W of Y.options) if (_$(W, J)) return true;
      return false;
    }
    case "intersection":
      return _$(Y.left, J) || _$(Y.right, J);
    case "tuple": {
      for (let W of Y.items) if (_$(W, J)) return true;
      if (Y.rest && _$(Y.rest, J)) return true;
      return false;
    }
    case "record":
      return _$(Y.keyType, J) || _$(Y.valueType, J);
    case "map":
      return _$(Y.keyType, J) || _$(Y.valueType, J);
    case "set":
      return _$(Y.valueType, J);
    case "promise":
    case "optional":
    case "nonoptional":
    case "nullable":
    case "readonly":
      return _$(Y.innerType, J);
    case "lazy":
      return _$(Y.getter(), J);
    case "default":
      return _$(Y.innerType, J);
    case "prefault":
      return _$(Y.innerType, J);
    case "custom":
      return false;
    case "transform":
      return true;
    case "pipe":
      return _$(Y.in, J) || _$(Y.out, J);
    case "success":
      return false;
    case "catch":
      return false;
    default:
  }
  throw Error(`Unknown schema type: ${Y.type}`);
}
var qN = {};
var mb = q("ZodMiniType", ($, X) => {
  if (!$._zod) throw Error("Uninitialized schema in ZodMiniType.");
  d.init($, X), $.def = X, $.parse = (J, Q) => E1($, J, Q, { callee: $.parse }), $.safeParse = (J, Q) => l4($, J, Q), $.parseAsync = async (J, Q) => S1($, J, Q, { callee: $.parseAsync }), $.safeParseAsync = async (J, Q) => c4($, J, Q), $.check = (...J) => {
    return $.clone({ ...X, checks: [...X.checks ?? [], ...J.map((Q) => typeof Q === "function" ? { _zod: { check: Q, def: { check: "custom" }, onattach: [] } } : Q)] });
  }, $.clone = (J, Q) => p$($, J, Q), $.brand = () => $, $.register = (J, Q) => {
    return J.add($, Q), $;
  };
});
var lb = q("ZodMiniObject", ($, X) => {
  xX.init($, X), mb.init($, X), R.defineLazy($, "shape", () => X.shape);
});
var t4 = {};
H1(t4, { xid: () => WZ, void: () => PZ, uuidv7: () => sb, uuidv6: () => ab, uuidv4: () => tb, uuid: () => ob, url: () => eb, uppercase: () => H9, unknown: () => j$, union: () => K$, undefined: () => bZ, ulid: () => QZ, uint64: () => AZ, uint32: () => jZ, tuple: () => vZ, trim: () => B9, treeifyError: () => HY, transform: () => qG, toUpperCase: () => L9, toLowerCase: () => q9, toJSONSchema: () => g0, templateLiteral: () => hZ, symbol: () => IZ, superRefine: () => XO, success: () => fZ, stringbool: () => lZ, stringFormat: () => BZ, string: () => F, strictObject: () => SZ, startsWith: () => V9, size: () => z9, setErrorMap: () => dZ, set: () => _Z, safeParseAsync: () => i3, safeParse: () => d3, registry: () => gX, regexes: () => p4, regex: () => G9, refine: () => $O, record: () => V$, readonly: () => rN, property: () => T3, promise: () => uZ, prettifyError: () => KY, preprocess: () => UQ, prefault: () => mN, positive: () => C3, pipe: () => XQ, partialRecord: () => CZ, parseAsync: () => p3, parse: () => c3, overwrite: () => M4, optional: () => D$, object: () => _, number: () => z$, nullish: () => yZ, nullable: () => $Q, null: () => JQ, normalize: () => w9, nonpositive: () => _3, nonoptional: () => lN, nonnegative: () => x3, never: () => YQ, negative: () => k3, nativeEnum: () => xZ, nanoid: () => XZ, nan: () => gZ, multipleOf: () => _1, minSize: () => x1, minLength: () => n4, mime: () => O9, maxSize: () => T0, maxLength: () => y0, map: () => kZ, lte: () => b6, lt: () => j4, lowercase: () => U9, looseObject: () => d$, locales: () => _0, literal: () => g, length: () => f0, lazy: () => aN, ksuid: () => zZ, keyof: () => EZ, jwt: () => wZ, json: () => cZ, iso: () => u0, ipv6: () => UZ, ipv4: () => GZ, intersection: () => b9, int64: () => MZ, int32: () => DZ, int: () => n3, instanceof: () => mZ, includes: () => K9, guid: () => rb, gte: () => U6, gt: () => F4, globalRegistry: () => G6, getErrorMap: () => iZ, function: () => p7, formatError: () => R0, float64: () => LZ, float32: () => qZ, flattenError: () => P0, file: () => TZ, enum: () => a$, endsWith: () => N9, emoji: () => $Z, email: () => nb, e164: () => OZ, discriminatedUnion: () => zQ, date: () => RZ, custom: () => FG, cuid2: () => YZ, cuid: () => JZ, core: () => f6, config: () => E$, coerce: () => MG, clone: () => p$, cidrv6: () => KZ, cidrv4: () => HZ, check: () => eN, catch: () => dN, boolean: () => v$, bigint: () => FZ, base64url: () => NZ, base64: () => VZ, array: () => $$, any: () => ZZ, _default: () => hN, _ZodString: () => r3, ZodXID: () => JG, ZodVoid: () => EN, ZodUnknown: () => PN, ZodUnion: () => OG, ZodUndefined: () => IN, ZodUUID: () => A4, ZodURL: () => t3, ZodULID: () => XG, ZodType: () => s, ZodTuple: () => kN, ZodTransform: () => BG, ZodTemplateLiteral: () => oN, ZodSymbol: () => AN, ZodSuccess: () => cN, ZodStringFormat: () => L$, ZodString: () => F9, ZodSet: () => xN, ZodRecord: () => wG, ZodRealError: () => m0, ZodReadonly: () => nN, ZodPromise: () => sN, ZodPrefault: () => uN, ZodPipe: () => jG, ZodOptional: () => LG, ZodObject: () => WQ, ZodNumberFormat: () => l0, ZodNumber: () => M9, ZodNullable: () => fN, ZodNull: () => bN, ZodNonOptional: () => DG, ZodNever: () => RN, ZodNanoID: () => s3, ZodNaN: () => iN, ZodMap: () => _N, ZodLiteral: () => TN, ZodLazy: () => tN, ZodKSUID: () => YG, ZodJWT: () => VG, ZodIssueCode: () => pZ, ZodIntersection: () => CN, ZodISOTime: () => a7, ZodISODuration: () => s7, ZodISODateTime: () => o7, ZodISODate: () => t7, ZodIPv6: () => WG, ZodIPv4: () => QG, ZodGUID: () => e7, ZodFile: () => yN, ZodError: () => db, ZodEnum: () => j9, ZodEmoji: () => a3, ZodEmail: () => o3, ZodE164: () => KG, ZodDiscriminatedUnion: () => vN, ZodDefault: () => gN, ZodDate: () => QQ, ZodCustomStringFormat: () => MN, ZodCustom: () => GQ, ZodCatch: () => pN, ZodCUID2: () => $G, ZodCUID: () => e3, ZodCIDRv6: () => GG, ZodCIDRv4: () => zG, ZodBoolean: () => A9, ZodBigIntFormat: () => NG, ZodBigInt: () => I9, ZodBase64URL: () => HG, ZodBase64: () => UG, ZodArray: () => SN, ZodAny: () => ZN, TimePrecision: () => F7, NEVER: () => zY, $output: () => L7, $input: () => D7, $brand: () => GY });
var u0 = {};
H1(u0, { time: () => m3, duration: () => l3, datetime: () => h3, date: () => u3, ZodISOTime: () => a7, ZodISODuration: () => s7, ZodISODateTime: () => o7, ZodISODate: () => t7 });
var o7 = q("ZodISODateTime", ($, X) => {
  _z.init($, X), L$.init($, X);
});
function h3($) {
  return I3(o7, $);
}
var t7 = q("ZodISODate", ($, X) => {
  xz.init($, X), L$.init($, X);
});
function u3($) {
  return b3(t7, $);
}
var a7 = q("ZodISOTime", ($, X) => {
  Tz.init($, X), L$.init($, X);
});
function m3($) {
  return Z3(a7, $);
}
var s7 = q("ZodISODuration", ($, X) => {
  yz.init($, X), L$.init($, X);
});
function l3($) {
  return P3(s7, $);
}
var FN = ($, X) => {
  CX.init($, X), $.name = "ZodError", Object.defineProperties($, { format: { value: (J) => R0($, J) }, flatten: { value: (J) => P0($, J) }, addIssue: { value: (J) => $.issues.push(J) }, addIssues: { value: (J) => $.issues.push(...J) }, isEmpty: { get() {
    return $.issues.length === 0;
  } } });
};
var db = q("ZodError", FN);
var m0 = q("ZodError", FN, { Parent: Error });
var c3 = VY(m0);
var p3 = NY(m0);
var d3 = OY(m0);
var i3 = wY(m0);
var s = q("ZodType", ($, X) => {
  return d.init($, X), $.def = X, Object.defineProperty($, "_def", { value: X }), $.check = (...J) => {
    return $.clone({ ...X, checks: [...X.checks ?? [], ...J.map((Q) => typeof Q === "function" ? { _zod: { check: Q, def: { check: "custom" }, onattach: [] } } : Q)] });
  }, $.clone = (J, Q) => p$($, J, Q), $.brand = () => $, $.register = (J, Q) => {
    return J.add($, Q), $;
  }, $.parse = (J, Q) => c3($, J, Q, { callee: $.parse }), $.safeParse = (J, Q) => d3($, J, Q), $.parseAsync = async (J, Q) => p3($, J, Q, { callee: $.parseAsync }), $.safeParseAsync = async (J, Q) => i3($, J, Q), $.spa = $.safeParseAsync, $.refine = (J, Q) => $.check($O(J, Q)), $.superRefine = (J) => $.check(XO(J)), $.overwrite = (J) => $.check(M4(J)), $.optional = () => D$($), $.nullable = () => $Q($), $.nullish = () => D$($Q($)), $.nonoptional = (J) => lN($, J), $.array = () => $$($), $.or = (J) => K$([$, J]), $.and = (J) => b9($, J), $.transform = (J) => XQ($, qG(J)), $.default = (J) => hN($, J), $.prefault = (J) => mN($, J), $.catch = (J) => dN($, J), $.pipe = (J) => XQ($, J), $.readonly = () => rN($), $.describe = (J) => {
    let Q = $.clone();
    return G6.add(Q, { description: J }), Q;
  }, Object.defineProperty($, "description", { get() {
    return G6.get($)?.description;
  }, configurable: true }), $.meta = (...J) => {
    if (J.length === 0) return G6.get($);
    let Q = $.clone();
    return G6.add(Q, J[0]), Q;
  }, $.isOptional = () => $.safeParse(void 0).success, $.isNullable = () => $.safeParse(null).success, $;
});
var r3 = q("_ZodString", ($, X) => {
  d4.init($, X), s.init($, X);
  let J = $._zod.bag;
  $.format = J.format ?? null, $.minLength = J.minimum ?? null, $.maxLength = J.maximum ?? null, $.regex = (...Q) => $.check(G9(...Q)), $.includes = (...Q) => $.check(K9(...Q)), $.startsWith = (...Q) => $.check(V9(...Q)), $.endsWith = (...Q) => $.check(N9(...Q)), $.min = (...Q) => $.check(n4(...Q)), $.max = (...Q) => $.check(y0(...Q)), $.length = (...Q) => $.check(f0(...Q)), $.nonempty = (...Q) => $.check(n4(1, ...Q)), $.lowercase = (Q) => $.check(U9(Q)), $.uppercase = (Q) => $.check(H9(Q)), $.trim = () => $.check(B9()), $.normalize = (...Q) => $.check(w9(...Q)), $.toLowerCase = () => $.check(q9()), $.toUpperCase = () => $.check(L9());
});
var F9 = q("ZodString", ($, X) => {
  d4.init($, X), r3.init($, X), $.email = (J) => $.check(hX(o3, J)), $.url = (J) => $.check(pX(t3, J)), $.jwt = (J) => $.check(W9(VG, J)), $.emoji = (J) => $.check(dX(a3, J)), $.guid = (J) => $.check(x0(e7, J)), $.uuid = (J) => $.check(uX(A4, J)), $.uuidv4 = (J) => $.check(mX(A4, J)), $.uuidv6 = (J) => $.check(lX(A4, J)), $.uuidv7 = (J) => $.check(cX(A4, J)), $.nanoid = (J) => $.check(iX(s3, J)), $.guid = (J) => $.check(x0(e7, J)), $.cuid = (J) => $.check(nX(e3, J)), $.cuid2 = (J) => $.check(rX($G, J)), $.ulid = (J) => $.check(oX(XG, J)), $.base64 = (J) => $.check(J9(UG, J)), $.base64url = (J) => $.check(Y9(HG, J)), $.xid = (J) => $.check(tX(JG, J)), $.ksuid = (J) => $.check(aX(YG, J)), $.ipv4 = (J) => $.check(sX(QG, J)), $.ipv6 = (J) => $.check(eX(WG, J)), $.cidrv4 = (J) => $.check($9(zG, J)), $.cidrv6 = (J) => $.check(X9(GG, J)), $.e164 = (J) => $.check(Q9(KG, J)), $.datetime = (J) => $.check(h3(J)), $.date = (J) => $.check(u3(J)), $.time = (J) => $.check(m3(J)), $.duration = (J) => $.check(l3(J));
});
function F($) {
  return j7(F9, $);
}
var L$ = q("ZodStringFormat", ($, X) => {
  H$.init($, X), r3.init($, X);
});
var o3 = q("ZodEmail", ($, X) => {
  IY.init($, X), L$.init($, X);
});
function nb($) {
  return hX(o3, $);
}
var e7 = q("ZodGUID", ($, X) => {
  MY.init($, X), L$.init($, X);
});
function rb($) {
  return x0(e7, $);
}
var A4 = q("ZodUUID", ($, X) => {
  AY.init($, X), L$.init($, X);
});
function ob($) {
  return uX(A4, $);
}
function tb($) {
  return mX(A4, $);
}
function ab($) {
  return lX(A4, $);
}
function sb($) {
  return cX(A4, $);
}
var t3 = q("ZodURL", ($, X) => {
  bY.init($, X), L$.init($, X);
});
function eb($) {
  return pX(t3, $);
}
var a3 = q("ZodEmoji", ($, X) => {
  ZY.init($, X), L$.init($, X);
});
function $Z($) {
  return dX(a3, $);
}
var s3 = q("ZodNanoID", ($, X) => {
  PY.init($, X), L$.init($, X);
});
function XZ($) {
  return iX(s3, $);
}
var e3 = q("ZodCUID", ($, X) => {
  RY.init($, X), L$.init($, X);
});
function JZ($) {
  return nX(e3, $);
}
var $G = q("ZodCUID2", ($, X) => {
  EY.init($, X), L$.init($, X);
});
function YZ($) {
  return rX($G, $);
}
var XG = q("ZodULID", ($, X) => {
  SY.init($, X), L$.init($, X);
});
function QZ($) {
  return oX(XG, $);
}
var JG = q("ZodXID", ($, X) => {
  vY.init($, X), L$.init($, X);
});
function WZ($) {
  return tX(JG, $);
}
var YG = q("ZodKSUID", ($, X) => {
  CY.init($, X), L$.init($, X);
});
function zZ($) {
  return aX(YG, $);
}
var QG = q("ZodIPv4", ($, X) => {
  kY.init($, X), L$.init($, X);
});
function GZ($) {
  return sX(QG, $);
}
var WG = q("ZodIPv6", ($, X) => {
  _Y.init($, X), L$.init($, X);
});
function UZ($) {
  return eX(WG, $);
}
var zG = q("ZodCIDRv4", ($, X) => {
  xY.init($, X), L$.init($, X);
});
function HZ($) {
  return $9(zG, $);
}
var GG = q("ZodCIDRv6", ($, X) => {
  TY.init($, X), L$.init($, X);
});
function KZ($) {
  return X9(GG, $);
}
var UG = q("ZodBase64", ($, X) => {
  yY.init($, X), L$.init($, X);
});
function VZ($) {
  return J9(UG, $);
}
var HG = q("ZodBase64URL", ($, X) => {
  fY.init($, X), L$.init($, X);
});
function NZ($) {
  return Y9(HG, $);
}
var KG = q("ZodE164", ($, X) => {
  gY.init($, X), L$.init($, X);
});
function OZ($) {
  return Q9(KG, $);
}
var VG = q("ZodJWT", ($, X) => {
  hY.init($, X), L$.init($, X);
});
function wZ($) {
  return W9(VG, $);
}
var MN = q("ZodCustomStringFormat", ($, X) => {
  uY.init($, X), L$.init($, X);
});
function BZ($, X, J = {}) {
  return c7(MN, $, X, J);
}
var M9 = q("ZodNumber", ($, X) => {
  kX.init($, X), s.init($, X), $.gt = (Q, Y) => $.check(F4(Q, Y)), $.gte = (Q, Y) => $.check(U6(Q, Y)), $.min = (Q, Y) => $.check(U6(Q, Y)), $.lt = (Q, Y) => $.check(j4(Q, Y)), $.lte = (Q, Y) => $.check(b6(Q, Y)), $.max = (Q, Y) => $.check(b6(Q, Y)), $.int = (Q) => $.check(n3(Q)), $.safe = (Q) => $.check(n3(Q)), $.positive = (Q) => $.check(F4(0, Q)), $.nonnegative = (Q) => $.check(U6(0, Q)), $.negative = (Q) => $.check(j4(0, Q)), $.nonpositive = (Q) => $.check(b6(0, Q)), $.multipleOf = (Q, Y) => $.check(_1(Q, Y)), $.step = (Q, Y) => $.check(_1(Q, Y)), $.finite = () => $;
  let J = $._zod.bag;
  $.minValue = Math.max(J.minimum ?? Number.NEGATIVE_INFINITY, J.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null, $.maxValue = Math.min(J.maximum ?? Number.POSITIVE_INFINITY, J.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null, $.isInt = (J.format ?? "").includes("int") || Number.isSafeInteger(J.multipleOf ?? 0.5), $.isFinite = true, $.format = J.format ?? null;
});
function z$($) {
  return M7(M9, $);
}
var l0 = q("ZodNumberFormat", ($, X) => {
  mY.init($, X), M9.init($, X);
});
function n3($) {
  return A7(l0, $);
}
function qZ($) {
  return I7(l0, $);
}
function LZ($) {
  return b7(l0, $);
}
function DZ($) {
  return Z7(l0, $);
}
function jZ($) {
  return P7(l0, $);
}
var A9 = q("ZodBoolean", ($, X) => {
  S0.init($, X), s.init($, X);
});
function v$($) {
  return R7(A9, $);
}
var I9 = q("ZodBigInt", ($, X) => {
  _X.init($, X), s.init($, X), $.gte = (Q, Y) => $.check(U6(Q, Y)), $.min = (Q, Y) => $.check(U6(Q, Y)), $.gt = (Q, Y) => $.check(F4(Q, Y)), $.gte = (Q, Y) => $.check(U6(Q, Y)), $.min = (Q, Y) => $.check(U6(Q, Y)), $.lt = (Q, Y) => $.check(j4(Q, Y)), $.lte = (Q, Y) => $.check(b6(Q, Y)), $.max = (Q, Y) => $.check(b6(Q, Y)), $.positive = (Q) => $.check(F4(BigInt(0), Q)), $.negative = (Q) => $.check(j4(BigInt(0), Q)), $.nonpositive = (Q) => $.check(b6(BigInt(0), Q)), $.nonnegative = (Q) => $.check(U6(BigInt(0), Q)), $.multipleOf = (Q, Y) => $.check(_1(Q, Y));
  let J = $._zod.bag;
  $.minValue = J.minimum ?? null, $.maxValue = J.maximum ?? null, $.format = J.format ?? null;
});
function FZ($) {
  return E7(I9, $);
}
var NG = q("ZodBigIntFormat", ($, X) => {
  lY.init($, X), I9.init($, X);
});
function MZ($) {
  return S7(NG, $);
}
function AZ($) {
  return v7(NG, $);
}
var AN = q("ZodSymbol", ($, X) => {
  cY.init($, X), s.init($, X);
});
function IZ($) {
  return C7(AN, $);
}
var IN = q("ZodUndefined", ($, X) => {
  pY.init($, X), s.init($, X);
});
function bZ($) {
  return k7(IN, $);
}
var bN = q("ZodNull", ($, X) => {
  dY.init($, X), s.init($, X);
});
function JQ($) {
  return _7(bN, $);
}
var ZN = q("ZodAny", ($, X) => {
  iY.init($, X), s.init($, X);
});
function ZZ() {
  return x7(ZN);
}
var PN = q("ZodUnknown", ($, X) => {
  C1.init($, X), s.init($, X);
});
function j$() {
  return k1(PN);
}
var RN = q("ZodNever", ($, X) => {
  nY.init($, X), s.init($, X);
});
function YQ($) {
  return T7(RN, $);
}
var EN = q("ZodVoid", ($, X) => {
  rY.init($, X), s.init($, X);
});
function PZ($) {
  return y7(EN, $);
}
var QQ = q("ZodDate", ($, X) => {
  oY.init($, X), s.init($, X), $.min = (Q, Y) => $.check(U6(Q, Y)), $.max = (Q, Y) => $.check(b6(Q, Y));
  let J = $._zod.bag;
  $.minDate = J.minimum ? new Date(J.minimum) : null, $.maxDate = J.maximum ? new Date(J.maximum) : null;
});
function RZ($) {
  return f7(QQ, $);
}
var SN = q("ZodArray", ($, X) => {
  v0.init($, X), s.init($, X), $.element = X.element, $.min = (J, Q) => $.check(n4(J, Q)), $.nonempty = (J) => $.check(n4(1, J)), $.max = (J, Q) => $.check(y0(J, Q)), $.length = (J, Q) => $.check(f0(J, Q)), $.unwrap = () => $.element;
});
function $$($, X) {
  return D9(SN, $, X);
}
function EZ($) {
  let X = $._zod.def.shape;
  return g(Object.keys(X));
}
var WQ = q("ZodObject", ($, X) => {
  xX.init($, X), s.init($, X), R.defineLazy($, "shape", () => X.shape), $.keyof = () => a$(Object.keys($._zod.def.shape)), $.catchall = (J) => $.clone({ ...$._zod.def, catchall: J }), $.passthrough = () => $.clone({ ...$._zod.def, catchall: j$() }), $.loose = () => $.clone({ ...$._zod.def, catchall: j$() }), $.strict = () => $.clone({ ...$._zod.def, catchall: YQ() }), $.strip = () => $.clone({ ...$._zod.def, catchall: void 0 }), $.extend = (J) => {
    return R.extend($, J);
  }, $.merge = (J) => R.merge($, J), $.pick = (J) => R.pick($, J), $.omit = (J) => R.omit($, J), $.partial = (...J) => R.partial(LG, $, J[0]), $.required = (...J) => R.required(DG, $, J[0]);
});
function _($, X) {
  let J = { type: "object", get shape() {
    return R.assignProp(this, "shape", { ...$ }), this.shape;
  }, ...R.normalizeParams(X) };
  return new WQ(J);
}
function SZ($, X) {
  return new WQ({ type: "object", get shape() {
    return R.assignProp(this, "shape", { ...$ }), this.shape;
  }, catchall: YQ(), ...R.normalizeParams(X) });
}
function d$($, X) {
  return new WQ({ type: "object", get shape() {
    return R.assignProp(this, "shape", { ...$ }), this.shape;
  }, catchall: j$(), ...R.normalizeParams(X) });
}
var OG = q("ZodUnion", ($, X) => {
  TX.init($, X), s.init($, X), $.options = X.options;
});
function K$($, X) {
  return new OG({ type: "union", options: $, ...R.normalizeParams(X) });
}
var vN = q("ZodDiscriminatedUnion", ($, X) => {
  OG.init($, X), tY.init($, X);
});
function zQ($, X, J) {
  return new vN({ type: "union", options: X, discriminator: $, ...R.normalizeParams(J) });
}
var CN = q("ZodIntersection", ($, X) => {
  aY.init($, X), s.init($, X);
});
function b9($, X) {
  return new CN({ type: "intersection", left: $, right: X });
}
var kN = q("ZodTuple", ($, X) => {
  i4.init($, X), s.init($, X), $.rest = (J) => $.clone({ ...$._zod.def, rest: J });
});
function vZ($, X, J) {
  let Q = X instanceof d, Y = Q ? J : X;
  return new kN({ type: "tuple", items: $, rest: Q ? X : null, ...R.normalizeParams(Y) });
}
var wG = q("ZodRecord", ($, X) => {
  sY.init($, X), s.init($, X), $.keyType = X.keyType, $.valueType = X.valueType;
});
function V$($, X, J) {
  return new wG({ type: "record", keyType: $, valueType: X, ...R.normalizeParams(J) });
}
function CZ($, X, J) {
  return new wG({ type: "record", keyType: K$([$, YQ()]), valueType: X, ...R.normalizeParams(J) });
}
var _N = q("ZodMap", ($, X) => {
  eY.init($, X), s.init($, X), $.keyType = X.keyType, $.valueType = X.valueType;
});
function kZ($, X, J) {
  return new _N({ type: "map", keyType: $, valueType: X, ...R.normalizeParams(J) });
}
var xN = q("ZodSet", ($, X) => {
  $7.init($, X), s.init($, X), $.min = (...J) => $.check(x1(...J)), $.nonempty = (J) => $.check(x1(1, J)), $.max = (...J) => $.check(T0(...J)), $.size = (...J) => $.check(z9(...J));
});
function _Z($, X) {
  return new xN({ type: "set", valueType: $, ...R.normalizeParams(X) });
}
var j9 = q("ZodEnum", ($, X) => {
  X7.init($, X), s.init($, X), $.enum = X.entries, $.options = Object.values(X.entries);
  let J = new Set(Object.keys(X.entries));
  $.extract = (Q, Y) => {
    let W = {};
    for (let z of Q) if (J.has(z)) W[z] = X.entries[z];
    else throw Error(`Key ${z} not found in enum`);
    return new j9({ ...X, checks: [], ...R.normalizeParams(Y), entries: W });
  }, $.exclude = (Q, Y) => {
    let W = { ...X.entries };
    for (let z of Q) if (J.has(z)) delete W[z];
    else throw Error(`Key ${z} not found in enum`);
    return new j9({ ...X, checks: [], ...R.normalizeParams(Y), entries: W });
  };
});
function a$($, X) {
  let J = Array.isArray($) ? Object.fromEntries($.map((Q) => [Q, Q])) : $;
  return new j9({ type: "enum", entries: J, ...R.normalizeParams(X) });
}
function xZ($, X) {
  return new j9({ type: "enum", entries: $, ...R.normalizeParams(X) });
}
var TN = q("ZodLiteral", ($, X) => {
  J7.init($, X), s.init($, X), $.values = new Set(X.values), Object.defineProperty($, "value", { get() {
    if (X.values.length > 1) throw Error("This schema contains multiple valid literal values. Use `.values` instead.");
    return X.values[0];
  } });
});
function g($, X) {
  return new TN({ type: "literal", values: Array.isArray($) ? $ : [$], ...R.normalizeParams(X) });
}
var yN = q("ZodFile", ($, X) => {
  Y7.init($, X), s.init($, X), $.min = (J, Q) => $.check(x1(J, Q)), $.max = (J, Q) => $.check(T0(J, Q)), $.mime = (J, Q) => $.check(O9(Array.isArray(J) ? J : [J], Q));
});
function TZ($) {
  return h7(yN, $);
}
var BG = q("ZodTransform", ($, X) => {
  C0.init($, X), s.init($, X), $._zod.parse = (J, Q) => {
    J.addIssue = (W) => {
      if (typeof W === "string") J.issues.push(R.issue(W, J.value, X));
      else {
        let z = W;
        if (z.fatal) z.continue = false;
        z.code ?? (z.code = "custom"), z.input ?? (z.input = J.value), z.inst ?? (z.inst = $), z.continue ?? (z.continue = true), J.issues.push(R.issue(z));
      }
    };
    let Y = X.transform(J.value, J);
    if (Y instanceof Promise) return Y.then((W) => {
      return J.value = W, J;
    });
    return J.value = Y, J;
  };
});
function qG($) {
  return new BG({ type: "transform", transform: $ });
}
var LG = q("ZodOptional", ($, X) => {
  Q7.init($, X), s.init($, X), $.unwrap = () => $._zod.def.innerType;
});
function D$($) {
  return new LG({ type: "optional", innerType: $ });
}
var fN = q("ZodNullable", ($, X) => {
  W7.init($, X), s.init($, X), $.unwrap = () => $._zod.def.innerType;
});
function $Q($) {
  return new fN({ type: "nullable", innerType: $ });
}
function yZ($) {
  return D$($Q($));
}
var gN = q("ZodDefault", ($, X) => {
  z7.init($, X), s.init($, X), $.unwrap = () => $._zod.def.innerType, $.removeDefault = $.unwrap;
});
function hN($, X) {
  return new gN({ type: "default", innerType: $, get defaultValue() {
    return typeof X === "function" ? X() : X;
  } });
}
var uN = q("ZodPrefault", ($, X) => {
  G7.init($, X), s.init($, X), $.unwrap = () => $._zod.def.innerType;
});
function mN($, X) {
  return new uN({ type: "prefault", innerType: $, get defaultValue() {
    return typeof X === "function" ? X() : X;
  } });
}
var DG = q("ZodNonOptional", ($, X) => {
  U7.init($, X), s.init($, X), $.unwrap = () => $._zod.def.innerType;
});
function lN($, X) {
  return new DG({ type: "nonoptional", innerType: $, ...R.normalizeParams(X) });
}
var cN = q("ZodSuccess", ($, X) => {
  H7.init($, X), s.init($, X), $.unwrap = () => $._zod.def.innerType;
});
function fZ($) {
  return new cN({ type: "success", innerType: $ });
}
var pN = q("ZodCatch", ($, X) => {
  K7.init($, X), s.init($, X), $.unwrap = () => $._zod.def.innerType, $.removeCatch = $.unwrap;
});
function dN($, X) {
  return new pN({ type: "catch", innerType: $, catchValue: typeof X === "function" ? X : () => X });
}
var iN = q("ZodNaN", ($, X) => {
  V7.init($, X), s.init($, X);
});
function gZ($) {
  return g7(iN, $);
}
var jG = q("ZodPipe", ($, X) => {
  k0.init($, X), s.init($, X), $.in = X.in, $.out = X.out;
});
function XQ($, X) {
  return new jG({ type: "pipe", in: $, out: X });
}
var nN = q("ZodReadonly", ($, X) => {
  N7.init($, X), s.init($, X);
});
function rN($) {
  return new nN({ type: "readonly", innerType: $ });
}
var oN = q("ZodTemplateLiteral", ($, X) => {
  O7.init($, X), s.init($, X);
});
function hZ($, X) {
  return new oN({ type: "template_literal", parts: $, ...R.normalizeParams(X) });
}
var tN = q("ZodLazy", ($, X) => {
  B7.init($, X), s.init($, X), $.unwrap = () => $._zod.def.getter();
});
function aN($) {
  return new tN({ type: "lazy", getter: $ });
}
var sN = q("ZodPromise", ($, X) => {
  w7.init($, X), s.init($, X), $.unwrap = () => $._zod.def.innerType;
});
function uZ($) {
  return new sN({ type: "promise", innerType: $ });
}
var GQ = q("ZodCustom", ($, X) => {
  q7.init($, X), s.init($, X);
});
function eN($, X) {
  let J = new A$({ check: "custom", ...R.normalizeParams(X) });
  return J._zod.check = $, J;
}
function FG($, X) {
  return u7(GQ, $ ?? (() => true), X);
}
function $O($, X = {}) {
  return m7(GQ, $, X);
}
function XO($, X) {
  let J = eN((Q) => {
    return Q.addIssue = (Y) => {
      if (typeof Y === "string") Q.issues.push(R.issue(Y, Q.value, J._zod.def));
      else {
        let W = Y;
        if (W.fatal) W.continue = false;
        W.code ?? (W.code = "custom"), W.input ?? (W.input = Q.value), W.inst ?? (W.inst = J), W.continue ?? (W.continue = !J._zod.def.abort), Q.issues.push(R.issue(W));
      }
    }, $(Q.value, Q);
  }, X);
  return J;
}
function mZ($, X = { error: `Input not instance of ${$.name}` }) {
  let J = new GQ({ type: "custom", check: "custom", fn: (Q) => Q instanceof $, abort: true, ...R.normalizeParams(X) });
  return J._zod.bag.Class = $, J;
}
var lZ = (...$) => l7({ Pipe: jG, Boolean: A9, String: F9, Transform: BG }, ...$);
function cZ($) {
  let X = aN(() => {
    return K$([F($), z$(), v$(), JQ(), $$(X), V$(F(), X)]);
  });
  return X;
}
function UQ($, X) {
  return XQ(qG($), X);
}
var pZ = { invalid_type: "invalid_type", too_big: "too_big", too_small: "too_small", invalid_format: "invalid_format", not_multiple_of: "not_multiple_of", unrecognized_keys: "unrecognized_keys", invalid_union: "invalid_union", invalid_key: "invalid_key", invalid_element: "invalid_element", invalid_value: "invalid_value", custom: "custom" };
function dZ($) {
  E$({ customError: $ });
}
function iZ() {
  return E$().customError;
}
var MG = {};
H1(MG, { string: () => nZ, number: () => rZ, date: () => aZ, boolean: () => oZ, bigint: () => tZ });
function nZ($) {
  return A3(F9, $);
}
function rZ($) {
  return R3(M9, $);
}
function oZ($) {
  return E3(A9, $);
}
function tZ($) {
  return S3(I9, $);
}
function aZ($) {
  return v3(QQ, $);
}
E$(yX());
var a4 = "io.modelcontextprotocol/related-task";
var KQ = "2.0";
var x$ = FG(($) => $ !== null && (typeof $ === "object" || typeof $ === "function"));
var YO = K$([F(), z$().int()]);
var QO = F();
var wr = d$({ ttl: z$().optional(), pollInterval: z$().optional() });
var sZ = _({ ttl: z$().optional() });
var eZ = _({ taskId: F() });
var IG = d$({ progressToken: YO.optional(), [a4]: eZ.optional() });
var j6 = _({ _meta: IG.optional() });
var Z9 = j6.extend({ task: sZ.optional() });
var h$ = _({ method: F(), params: j6.loose().optional() });
var P6 = _({ _meta: IG.optional() });
var R6 = _({ method: F(), params: P6.loose().optional() });
var u$ = d$({ _meta: IG.optional() });
var VQ = K$([F(), z$().int()]);
var zO = _({ jsonrpc: g(KQ), id: VQ, ...h$.shape }).strict();
var GO = _({ jsonrpc: g(KQ), ...R6.shape }).strict();
var ZG = _({ jsonrpc: g(KQ), id: VQ, result: u$ }).strict();
var m;
(function($) {
  $[$.ConnectionClosed = -32e3] = "ConnectionClosed", $[$.RequestTimeout = -32001] = "RequestTimeout", $[$.ParseError = -32700] = "ParseError", $[$.InvalidRequest = -32600] = "InvalidRequest", $[$.MethodNotFound = -32601] = "MethodNotFound", $[$.InvalidParams = -32602] = "InvalidParams", $[$.InternalError = -32603] = "InternalError", $[$.UrlElicitationRequired = -32042] = "UrlElicitationRequired";
})(m || (m = {}));
var PG = _({ jsonrpc: g(KQ), id: VQ.optional(), error: _({ code: z$().int(), message: F(), data: j$().optional() }) }).strict();
var Br = K$([zO, GO, ZG, PG]);
var qr = K$([ZG, PG]);
var NQ = u$.strict();
var $P = P6.extend({ requestId: VQ.optional(), reason: F().optional() });
var OQ = R6.extend({ method: g("notifications/cancelled"), params: $P });
var XP = _({ src: F(), mimeType: F().optional(), sizes: $$(F()).optional(), theme: a$(["light", "dark"]).optional() });
var R9 = _({ icons: $$(XP).optional() });
var c0 = _({ name: F(), title: F().optional() });
var KO = c0.extend({ ...c0.shape, ...R9.shape, version: F(), websiteUrl: F().optional(), description: F().optional() });
var JP = b9(_({ applyDefaults: v$().optional() }), V$(F(), j$()));
var YP = UQ(($) => {
  if ($ && typeof $ === "object" && !Array.isArray($)) {
    if (Object.keys($).length === 0) return { form: {} };
  }
  return $;
}, b9(_({ form: JP.optional(), url: x$.optional() }), V$(F(), j$()).optional()));
var QP = d$({ list: x$.optional(), cancel: x$.optional(), requests: d$({ sampling: d$({ createMessage: x$.optional() }).optional(), elicitation: d$({ create: x$.optional() }).optional() }).optional() });
var WP = d$({ list: x$.optional(), cancel: x$.optional(), requests: d$({ tools: d$({ call: x$.optional() }).optional() }).optional() });
var zP = _({ experimental: V$(F(), x$).optional(), sampling: _({ context: x$.optional(), tools: x$.optional() }).optional(), elicitation: YP.optional(), roots: _({ listChanged: v$().optional() }).optional(), tasks: QP.optional(), extensions: V$(F(), x$).optional() });
var GP = j6.extend({ protocolVersion: F(), capabilities: zP, clientInfo: KO });
var RG = h$.extend({ method: g("initialize"), params: GP });
var UP = _({ experimental: V$(F(), x$).optional(), logging: x$.optional(), completions: x$.optional(), prompts: _({ listChanged: v$().optional() }).optional(), resources: _({ subscribe: v$().optional(), listChanged: v$().optional() }).optional(), tools: _({ listChanged: v$().optional() }).optional(), tasks: WP.optional(), extensions: V$(F(), x$).optional() });
var HP = u$.extend({ protocolVersion: F(), capabilities: UP, serverInfo: KO, instructions: F().optional() });
var EG = R6.extend({ method: g("notifications/initialized"), params: P6.optional() });
var wQ = h$.extend({ method: g("ping"), params: j6.optional() });
var KP = _({ progress: z$(), total: D$(z$()), message: D$(F()) });
var VP = _({ ...P6.shape, ...KP.shape, progressToken: YO });
var BQ = R6.extend({ method: g("notifications/progress"), params: VP });
var NP = j6.extend({ cursor: QO.optional() });
var E9 = h$.extend({ params: NP.optional() });
var S9 = u$.extend({ nextCursor: QO.optional() });
var OP = a$(["working", "input_required", "completed", "failed", "cancelled"]);
var v9 = _({ taskId: F(), status: OP, ttl: K$([z$(), JQ()]), createdAt: F(), lastUpdatedAt: F(), pollInterval: D$(z$()), statusMessage: D$(F()) });
var p0 = u$.extend({ task: v9 });
var wP = P6.merge(v9);
var C9 = R6.extend({ method: g("notifications/tasks/status"), params: wP });
var qQ = h$.extend({ method: g("tasks/get"), params: j6.extend({ taskId: F() }) });
var LQ = u$.merge(v9);
var DQ = h$.extend({ method: g("tasks/result"), params: j6.extend({ taskId: F() }) });
var Lr = u$.loose();
var jQ = E9.extend({ method: g("tasks/list") });
var FQ = S9.extend({ tasks: $$(v9) });
var MQ = h$.extend({ method: g("tasks/cancel"), params: j6.extend({ taskId: F() }) });
var VO = u$.merge(v9);
var NO = _({ uri: F(), mimeType: D$(F()), _meta: V$(F(), j$()).optional() });
var OO = NO.extend({ text: F() });
var SG = F().refine(($) => {
  try {
    return atob($), true;
  } catch {
    return false;
  }
}, { message: "Invalid Base64 string" });
var wO = NO.extend({ blob: SG });
var k9 = a$(["user", "assistant"]);
var d0 = _({ audience: $$(k9).optional(), priority: z$().min(0).max(1).optional(), lastModified: u0.datetime({ offset: true }).optional() });
var BO = _({ ...c0.shape, ...R9.shape, uri: F(), description: D$(F()), mimeType: D$(F()), size: D$(z$()), annotations: d0.optional(), _meta: D$(d$({})) });
var BP = _({ ...c0.shape, ...R9.shape, uriTemplate: F(), description: D$(F()), mimeType: D$(F()), annotations: d0.optional(), _meta: D$(d$({})) });
var AQ = E9.extend({ method: g("resources/list") });
var qP = S9.extend({ resources: $$(BO) });
var IQ = E9.extend({ method: g("resources/templates/list") });
var LP = S9.extend({ resourceTemplates: $$(BP) });
var vG = j6.extend({ uri: F() });
var DP = vG;
var bQ = h$.extend({ method: g("resources/read"), params: DP });
var jP = u$.extend({ contents: $$(K$([OO, wO])) });
var FP = R6.extend({ method: g("notifications/resources/list_changed"), params: P6.optional() });
var MP = vG;
var AP = h$.extend({ method: g("resources/subscribe"), params: MP });
var IP = vG;
var bP = h$.extend({ method: g("resources/unsubscribe"), params: IP });
var ZP = P6.extend({ uri: F() });
var PP = R6.extend({ method: g("notifications/resources/updated"), params: ZP });
var RP = _({ name: F(), description: D$(F()), required: D$(v$()) });
var EP = _({ ...c0.shape, ...R9.shape, description: D$(F()), arguments: D$($$(RP)), _meta: D$(d$({})) });
var ZQ = E9.extend({ method: g("prompts/list") });
var SP = S9.extend({ prompts: $$(EP) });
var vP = j6.extend({ name: F(), arguments: V$(F(), F()).optional() });
var PQ = h$.extend({ method: g("prompts/get"), params: vP });
var CG = _({ type: g("text"), text: F(), annotations: d0.optional(), _meta: V$(F(), j$()).optional() });
var kG = _({ type: g("image"), data: SG, mimeType: F(), annotations: d0.optional(), _meta: V$(F(), j$()).optional() });
var _G = _({ type: g("audio"), data: SG, mimeType: F(), annotations: d0.optional(), _meta: V$(F(), j$()).optional() });
var CP = _({ type: g("tool_use"), name: F(), id: F(), input: V$(F(), j$()), _meta: V$(F(), j$()).optional() });
var kP = _({ type: g("resource"), resource: K$([OO, wO]), annotations: d0.optional(), _meta: V$(F(), j$()).optional() });
var _P = BO.extend({ type: g("resource_link") });
var xG = K$([CG, kG, _G, _P, kP]);
var xP = _({ role: k9, content: xG });
var TP = u$.extend({ description: F().optional(), messages: $$(xP) });
var yP = R6.extend({ method: g("notifications/prompts/list_changed"), params: P6.optional() });
var fP = _({ title: F().optional(), readOnlyHint: v$().optional(), destructiveHint: v$().optional(), idempotentHint: v$().optional(), openWorldHint: v$().optional() });
var gP = _({ taskSupport: a$(["required", "optional", "forbidden"]).optional() });
var qO = _({ ...c0.shape, ...R9.shape, description: F().optional(), inputSchema: _({ type: g("object"), properties: V$(F(), x$).optional(), required: $$(F()).optional() }).catchall(j$()), outputSchema: _({ type: g("object"), properties: V$(F(), x$).optional(), required: $$(F()).optional() }).catchall(j$()).optional(), annotations: fP.optional(), execution: gP.optional(), _meta: V$(F(), j$()).optional() });
var RQ = E9.extend({ method: g("tools/list") });
var hP = S9.extend({ tools: $$(qO) });
var EQ = u$.extend({ content: $$(xG).default([]), structuredContent: V$(F(), j$()).optional(), isError: v$().optional() });
var Dr = EQ.or(u$.extend({ toolResult: j$() }));
var uP = Z9.extend({ name: F(), arguments: V$(F(), j$()).optional() });
var i0 = h$.extend({ method: g("tools/call"), params: uP });
var mP = R6.extend({ method: g("notifications/tools/list_changed"), params: P6.optional() });
var jr = _({ autoRefresh: v$().default(true), debounceMs: z$().int().nonnegative().default(300) });
var _9 = a$(["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"]);
var lP = j6.extend({ level: _9 });
var TG = h$.extend({ method: g("logging/setLevel"), params: lP });
var cP = P6.extend({ level: _9, logger: F().optional(), data: j$() });
var pP = R6.extend({ method: g("notifications/message"), params: cP });
var dP = _({ name: F().optional() });
var iP = _({ hints: $$(dP).optional(), costPriority: z$().min(0).max(1).optional(), speedPriority: z$().min(0).max(1).optional(), intelligencePriority: z$().min(0).max(1).optional() });
var nP = _({ mode: a$(["auto", "required", "none"]).optional() });
var rP = _({ type: g("tool_result"), toolUseId: F().describe("The unique identifier for the corresponding tool call."), content: $$(xG).default([]), structuredContent: _({}).loose().optional(), isError: v$().optional(), _meta: V$(F(), j$()).optional() });
var oP = zQ("type", [CG, kG, _G]);
var HQ = zQ("type", [CG, kG, _G, CP, rP]);
var tP = _({ role: k9, content: K$([HQ, $$(HQ)]), _meta: V$(F(), j$()).optional() });
var aP = Z9.extend({ messages: $$(tP), modelPreferences: iP.optional(), systemPrompt: F().optional(), includeContext: a$(["none", "thisServer", "allServers"]).optional(), temperature: z$().optional(), maxTokens: z$().int(), stopSequences: $$(F()).optional(), metadata: x$.optional(), tools: $$(qO).optional(), toolChoice: nP.optional() });
var sP = h$.extend({ method: g("sampling/createMessage"), params: aP });
var x9 = u$.extend({ model: F(), stopReason: D$(a$(["endTurn", "stopSequence", "maxTokens"]).or(F())), role: k9, content: oP });
var yG = u$.extend({ model: F(), stopReason: D$(a$(["endTurn", "stopSequence", "maxTokens", "toolUse"]).or(F())), role: k9, content: K$([HQ, $$(HQ)]) });
var eP = _({ type: g("boolean"), title: F().optional(), description: F().optional(), default: v$().optional() });
var $R = _({ type: g("string"), title: F().optional(), description: F().optional(), minLength: z$().optional(), maxLength: z$().optional(), format: a$(["email", "uri", "date", "date-time"]).optional(), default: F().optional() });
var XR = _({ type: a$(["number", "integer"]), title: F().optional(), description: F().optional(), minimum: z$().optional(), maximum: z$().optional(), default: z$().optional() });
var JR = _({ type: g("string"), title: F().optional(), description: F().optional(), enum: $$(F()), default: F().optional() });
var YR = _({ type: g("string"), title: F().optional(), description: F().optional(), oneOf: $$(_({ const: F(), title: F() })), default: F().optional() });
var QR = _({ type: g("string"), title: F().optional(), description: F().optional(), enum: $$(F()), enumNames: $$(F()).optional(), default: F().optional() });
var WR = K$([JR, YR]);
var zR = _({ type: g("array"), title: F().optional(), description: F().optional(), minItems: z$().optional(), maxItems: z$().optional(), items: _({ type: g("string"), enum: $$(F()) }), default: $$(F()).optional() });
var GR = _({ type: g("array"), title: F().optional(), description: F().optional(), minItems: z$().optional(), maxItems: z$().optional(), items: _({ anyOf: $$(_({ const: F(), title: F() })) }), default: $$(F()).optional() });
var UR = K$([zR, GR]);
var HR = K$([QR, WR, UR]);
var KR = K$([HR, eP, $R, XR]);
var VR = Z9.extend({ mode: g("form").optional(), message: F(), requestedSchema: _({ type: g("object"), properties: V$(F(), KR), required: $$(F()).optional() }) });
var NR = Z9.extend({ mode: g("url"), message: F(), elicitationId: F(), url: F().url() });
var OR = K$([VR, NR]);
var wR = h$.extend({ method: g("elicitation/create"), params: OR });
var BR = P6.extend({ elicitationId: F() });
var qR = R6.extend({ method: g("notifications/elicitation/complete"), params: BR });
var n0 = u$.extend({ action: a$(["accept", "decline", "cancel"]), content: UQ(($) => $ === null ? void 0 : $, V$(F(), K$([F(), z$(), v$(), $$(F())])).optional()) });
var LR = _({ type: g("ref/resource"), uri: F() });
var DR = _({ type: g("ref/prompt"), name: F() });
var jR = j6.extend({ ref: K$([DR, LR]), argument: _({ name: F(), value: F() }), context: _({ arguments: V$(F(), F()).optional() }).optional() });
var SQ = h$.extend({ method: g("completion/complete"), params: jR });
var FR = u$.extend({ completion: d$({ values: $$(F()).max(100), total: D$(z$().int()), hasMore: D$(v$()) }) });
var MR = _({ uri: F().startsWith("file://"), name: F().optional(), _meta: V$(F(), j$()).optional() });
var AR = h$.extend({ method: g("roots/list"), params: j6.optional() });
var fG = u$.extend({ roots: $$(MR) });
var IR = R6.extend({ method: g("notifications/roots/list_changed"), params: P6.optional() });
var Fr = K$([wQ, RG, SQ, TG, PQ, ZQ, AQ, IQ, bQ, AP, bP, i0, RQ, qQ, DQ, jQ, MQ]);
var Mr = K$([OQ, BQ, EG, IR, C9]);
var Ar = K$([NQ, x9, yG, n0, fG, LQ, FQ, p0]);
var Ir = K$([wQ, sP, wR, AR, qQ, DQ, jQ, MQ]);
var br = K$([OQ, BQ, pP, PP, FP, mP, yP, C9, qR]);
var Zr = K$([NQ, HP, FR, TP, SP, qP, LP, jP, EQ, hP, LQ, FQ, p0]);
var MO = Symbol("Let zodToJsonSchema decide on which parser to use");
var PR = new Set("ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789");
var yD = qH(hU(), 1);
var fD = qH(TD(), 1);
var mD = Symbol.for("mcp.completable");
var uD;
(function($) {
  $.Completable = "McpCompletable";
})(uD || (uD = {}));
function rD($) {
  let X;
  return () => X ??= $();
}
var aT = rD(() => t4.object({ session_id: t4.string(), ws_url: t4.string(), work_dir: t4.string().optional(), session_key: t4.string().optional() }));
async function Uy($, X) {
  try {
    await Xy($, X);
  } catch (J) {
    if (!JX(J)) throw J;
  }
}
async function Hy($, X) {
  if (!$) return;
  let J = $;
  try {
    let Q = o$($);
    if (Q?.claudeAiOauth?.refreshToken) delete Q.claudeAiOauth.refreshToken, J = q$(Q);
  } catch {
  }
  await $j(X, J, { mode: 384 });
}
function Ky() {
  if (process.platform !== "darwin") return Promise.resolve(void 0);
  let $ = gV(fV);
  return new Promise((X) => {
    $y("security", ["find-generic-password", "-a", hV(), "-w", "-s", $], { encoding: "utf-8", timeout: 5e3 }, (J, Q) => X(J ? void 0 : Q.trim() || void 0));
  });
}
async function Yj($, X, J, Q, Y = 6e4) {
  if (!N$(X)) return;
  let W = zJ(J ?? "."), z = A1(W), G = await K1($.load({ projectKey: z, sessionId: X }), Y, `SessionStore.load() timed out after ${Y}ms for session ${X}`);
  if (!G || G.length === 0) return;
  let U = i6(Wy(), `claude-resume-${GH()}`);
  try {
    let H = i6(U, "projects", z);
    await YH(H, { recursive: true });
    let K = i6(H, `${X}.jsonl`);
    await GX(K, G);
    let V = Q?.CLAUDE_CONFIG_DIR ?? process.env.CLAUDE_CONFIG_DIR, N = V ?? i6(QH(), ".claude"), O;
    try {
      O = await Jy(i6(N, ".credentials.json"), "utf-8");
    } catch (w) {
      if (!JX(w)) throw w;
    }
    if (!V && !(Q?.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY) && !(Q?.CLAUDE_CODE_OAUTH_TOKEN ?? process.env.CLAUDE_CODE_OAUTH_TOKEN)) O = await Ky() ?? O;
    if (await Hy(O, i6(U, ".credentials.json")), await Uy(i6(V ?? QH(), ".claude.json"), i6(U, ".claude.json")), $.listSubkeys) {
      let w = i6(H, X), B = await K1($.listSubkeys({ projectKey: z, sessionId: X }), Y, `SessionStore.listSubkeys() timed out after ${Y}ms for session ${X}`);
      for (let D of B) {
        let j = zJ(w, D + ".jsonl");
        if (!D || Xj(D) || D.split(/[\\/]/).includes("..") || !j.startsWith(w + Jj)) {
          f$(`[SessionStore] skipping unsafe subpath from listSubkeys: ${D}`, { level: "warn" });
          continue;
        }
        let A = await K1($.load({ projectKey: z, sessionId: X, subpath: D }), Y, `SessionStore.load() timed out after ${Y}ms for session ${X} subpath ${D}`);
        if (!A || A.length === 0) continue;
        let I = [], x = [];
        for (let T of A) if (Wj(T)) I.push(T);
        else x.push(T);
        if (x.length > 0) await YH(sD(j), { recursive: true }), await GX(j, x);
        if (I.length > 0) {
          let T = I.at(-1), U$ = zJ(w, D + ".meta.json");
          await YH(sD(U$), { recursive: true });
          let { type: T$, ...n$ } = T;
          await $j(U$, q$(n$), { mode: 384 });
        }
      }
    }
    return U;
  } catch (H) {
    throw await q5(U), H;
  }
}
function WH($, X, J, Q) {
  let { systemPrompt: Y, settings: W, settingSources: z, sandbox: G, ...U } = $ ?? {}, H, K, V;
  if (Y === void 0) H = "";
  else if (typeof Y === "string") H = Y;
  else if (Array.isArray(Y)) H = Y;
  else if (Y.type === "preset") K = Y.append, V = Y.excludeDynamicSections;
  let N = U.pathToClaudeCodeExecutable;
  if (!N) {
    let n6 = Gy(import.meta.url), Q4 = Qy(n6), p1 = lJ((V8) => Q4.resolve(V8));
    if (p1) N = p1;
    else try {
      N = Q4.resolve("./cli.js");
    } catch {
      throw Error(`Native CLI binary for ${process.platform}-${process.arch} not found. Reinstall @anthropic-ai/claude-agent-sdk without --omit=optional, or set options.pathToClaudeCodeExecutable.`);
    }
  }
  process.env.CLAUDE_AGENT_SDK_VERSION = "0.2.112";
  let { abortController: O = d1(), additionalDirectories: w = [], agent: B, agents: D, allowedTools: j = [], betas: A, canUseTool: I, continue: x, cwd: T, debug: U$, debugFile: T$, disallowedTools: n$ = [], tools: X4, env: X6, executable: U1 = i1() ? "bun" : "node", executableArgs: l1 = [], extraArgs: J4 = {}, fallbackModel: z8, enableFileCheckpointing: p, toolConfig: G8, forkSession: D5, hooks: c1, includeHookEvents: U8, includePartialMessages: H8, onElicitation: GJ, persistSession: l$, sessionStore: v6, thinking: Y4, effort: Gj, maxThinkingTokens: j5, maxTurns: Uj, maxBudgetUsd: Hj, taskBudget: Kj, mcpServers: UH, model: Vj, outputFormat: HH, permissionMode: Nj = "default", allowDangerouslySkipPermissions: Oj = false, permissionPromptToolName: wj, plugins: Bj, getOAuthToken: KH, workload: VH, resume: qj, resumeSessionAt: Lj, sessionId: Dj, stderr: jj, strictMcpConfig: Fj } = U;
  if (v6 && l$ === false) throw Error("sessionStore cannot be used with persistSession: false -- the storage adapter requires local writes to mirror from. Use CLAUDE_CONFIG_DIR=/tmp for ephemeral local writes with external mirroring.");
  let NH = HH?.type === "json_schema" ? HH.schema : void 0, F6 = { ...process.env, ...X6 ?? {} };
  if (!X6?.CLAUDE_CODE_ENTRYPOINT) F6.CLAUDE_CODE_ENTRYPOINT = "sdk-ts";
  if (p) F6.CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING = "true";
  else if (!X6?.CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING) delete F6.CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING;
  if (KH) F6.CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH = "1";
  else if (!X6?.CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH) delete F6.CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH;
  if (G8?.askUserQuestion?.previewFormat) F6.CLAUDE_CODE_QUESTION_PREVIEW_FORMAT = G8.askUserQuestion.previewFormat;
  else if (!X6?.CLAUDE_CODE_QUESTION_PREVIEW_FORMAT) delete F6.CLAUDE_CODE_QUESTION_PREVIEW_FORMAT;
  for (let n6 of ["GITHUB_ACTIONS", "CLAUDECODE", "CLAUDE_CODE_SESSION_ID", "CLAUDE_CODE_EXECPATH"]) if (!X6?.[n6]) delete F6[n6];
  let OH = {}, wH = /* @__PURE__ */ new Map();
  if (UH) for (let [n6, Q4] of Object.entries(UH)) if (Q4.type === "sdk" && Q4.instance) wH.set(n6, Q4.instance);
  else OH[n6] = Q4;
  let K8;
  if (Y4) switch (Y4.type) {
    case "adaptive":
      K8 = { type: "adaptive", display: Y4.display };
      break;
    case "enabled":
      K8 = { type: "enabled", budgetTokens: Y4.budgetTokens, display: Y4.display };
      break;
    case "disabled":
      K8 = { type: "disabled" };
      break;
  }
  else if (j5 !== void 0) K8 = j5 === 0 ? { type: "disabled" } : { type: "enabled", budgetTokens: j5 };
  if (J) F6.CLAUDE_CONFIG_DIR = J;
  let BH = new QX({ abortController: O, additionalDirectories: w, agent: B, betas: A, cwd: T, debug: U$, debugFile: T$, executable: U1, executableArgs: l1, extraArgs: VH ? { ...J4, workload: VH } : J4, pathToClaudeCodeExecutable: N, env: F6, forkSession: D5, stderr: jj, thinkingConfig: K8, effort: Gj, maxTurns: Uj, maxBudgetUsd: Hj, taskBudget: Kj, model: Vj, fallbackModel: z8, jsonSchema: NH, permissionMode: Nj, allowDangerouslySkipPermissions: Oj, permissionPromptToolName: wj, continueConversation: x, resume: qj, resumeSessionAt: Lj, sessionId: Dj, settings: typeof W === "object" ? q$(W) : W, settingSources: z, allowedTools: j, disallowedTools: n$, tools: X4, mcpServers: OH, strictMcpConfig: Fj, canUseTool: !!I, hooks: !!c1, includeHookEvents: U8, includePartialMessages: H8, persistSession: l$, sessionMirror: !!v6, plugins: Bj, sandbox: G, spawnClaudeCodeProcess: U.spawnClaudeCodeProcess, deferSpawn: Q }), Mj = { systemPrompt: H, appendSystemPrompt: K, appendSubagentSystemPrompt: U.appendSubagentSystemPrompt, excludeDynamicSections: V, agents: D, promptSuggestions: U.promptSuggestions, agentProgressSummaries: U.agentProgressSummaries }, F5 = new WX(BH, X, I, c1, O, wH, NH, Mj, GJ, KH);
  if (v6) {
    let n6 = () => i6(F6.CLAUDE_CONFIG_DIR ?? i6(QH(), ".claude"), "projects"), Q4 = new HW(async (p1, V8) => {
      let N8 = eD(p1, n6());
      if (N8) await v6.append(N8, V8);
    }, void 0, (p1, V8) => {
      let N8 = eD(p1, n6());
      if (N8) F5.reportMirrorError(N8, V8.message);
    });
    F5.setTranscriptMirrorBatcher(Q4);
  }
  return { queryInstance: F5, transport: BH, abortController: O, processEnv: F6 };
}
function zH($, X, J, Q) {
  if (typeof J === "string") X.write(q$({ type: "user", session_id: "", message: { role: "user", content: [{ type: "text", text: J }] }, parent_tool_use_id: null }) + `
`);
  else $.streamInput(J).catch((Y) => Q.abort(Y));
}
var Vy = /* @__PURE__ */ new Set(["EBUSY", "EMFILE", "ENFILE", "ENOTEMPTY", "EPERM"]);
async function q5($) {
  for (let X = 0; ; X++) try {
    return await Yy($, { recursive: true, force: true });
  } catch (J) {
    if (X >= 4 || !Vy.has(_6(J) ?? "")) return;
    await LH((X + 1) * 100);
  }
}
function Ny($, X) {
  $.waitForExit().catch(() => {
  }).finally(() => q5(X));
}
function E$$({ prompt: $, options: X }) {
  if (X?.resume && X?.sessionStore) {
    let { queryInstance: W, transport: z, abortController: G, processEnv: U } = WH({ ...X }, typeof $ === "string", void 0, true), H = zJ(X.cwd ?? ".");
    return Yj(X.sessionStore, X.resume, H, X.env, X.loadTimeoutMs).then((V) => {
      if (V) z.updateEnv({ CLAUDE_CONFIG_DIR: V }), U.CLAUDE_CONFIG_DIR = V, W.addCleanupCallback(() => Ny(z, V));
      if (!W.isClosed()) z.spawn();
    }).catch((V) => {
      let N = f4(V);
      z.spawnAbort(N), W.setError(N);
    }), zH(W, z, $, G), W;
  }
  let { queryInstance: J, transport: Q, abortController: Y } = WH(X, typeof $ === "string");
  return zH(J, Q, $, Y), J;
}
function Wj($) {
  return typeof $ === "object" && $ !== null && "type" in $ && $.type === "agent_metadata";
}
function eD($, X) {
  let J = zy(X, $);
  if (J.startsWith("..") || Xj(J)) return null;
  let Q = J.split(Jj);
  if (Q.length < 2) return null;
  let Y = Q[0], W = Q[1];
  if (Q.length === 2 && W.endsWith(".jsonl")) return { projectKey: Y, sessionId: W.replace(/\.jsonl$/, "") };
  if (Q.length >= 4) {
    let z = Q.slice(2), G = z.length - 1;
    return z[G] = z.at(-1).replace(/\.jsonl$/, ""), { projectKey: Y, sessionId: W, subpath: z.join("/") };
  }
  return null;
}

// ../../node_modules/.pnpm/@openai+codex-sdk@0.121.0/node_modules/@openai/codex-sdk/dist/index.js
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import path2 from "path";
import readline from "readline";
import { createRequire } from "module";
async function createOutputSchemaFile(schema) {
  if (schema === void 0) {
    return { cleanup: async () => {
    } };
  }
  if (!isJsonObject(schema)) {
    throw new Error("outputSchema must be a plain JSON object");
  }
  const schemaDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-output-schema-"));
  const schemaPath = path.join(schemaDir, "schema.json");
  const cleanup = async () => {
    try {
      await fs.rm(schemaDir, { recursive: true, force: true });
    } catch {
    }
  };
  try {
    await fs.writeFile(schemaPath, JSON.stringify(schema), "utf8");
    return { schemaPath, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
function isJsonObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var Thread = class {
  _exec;
  _options;
  _id;
  _threadOptions;
  /** Returns the ID of the thread. Populated after the first turn starts. */
  get id() {
    return this._id;
  }
  /* @internal */
  constructor(exec, options, threadOptions, id = null) {
    this._exec = exec;
    this._options = options;
    this._id = id;
    this._threadOptions = threadOptions;
  }
  /** Provides the input to the agent and streams events as they are produced during the turn. */
  async runStreamed(input, turnOptions = {}) {
    return { events: this.runStreamedInternal(input, turnOptions) };
  }
  async *runStreamedInternal(input, turnOptions = {}) {
    const { schemaPath, cleanup } = await createOutputSchemaFile(turnOptions.outputSchema);
    const options = this._threadOptions;
    const { prompt, images } = normalizeInput(input);
    const generator = this._exec.run({
      input: prompt,
      baseUrl: this._options.baseUrl,
      apiKey: this._options.apiKey,
      threadId: this._id,
      images,
      model: options?.model,
      sandboxMode: options?.sandboxMode,
      workingDirectory: options?.workingDirectory,
      skipGitRepoCheck: options?.skipGitRepoCheck,
      outputSchemaFile: schemaPath,
      modelReasoningEffort: options?.modelReasoningEffort,
      signal: turnOptions.signal,
      networkAccessEnabled: options?.networkAccessEnabled,
      webSearchMode: options?.webSearchMode,
      webSearchEnabled: options?.webSearchEnabled,
      approvalPolicy: options?.approvalPolicy,
      additionalDirectories: options?.additionalDirectories
    });
    try {
      for await (const item of generator) {
        let parsed;
        try {
          parsed = JSON.parse(item);
        } catch (error) {
          throw new Error(`Failed to parse item: ${item}`, { cause: error });
        }
        if (parsed.type === "thread.started") {
          this._id = parsed.thread_id;
        }
        yield parsed;
      }
    } finally {
      await cleanup();
    }
  }
  /** Provides the input to the agent and returns the completed turn. */
  async run(input, turnOptions = {}) {
    const generator = this.runStreamedInternal(input, turnOptions);
    const items = [];
    let finalResponse = "";
    let usage = null;
    let turnFailure = null;
    for await (const event of generator) {
      if (event.type === "item.completed") {
        if (event.item.type === "agent_message") {
          finalResponse = event.item.text;
        }
        items.push(event.item);
      } else if (event.type === "turn.completed") {
        usage = event.usage;
      } else if (event.type === "turn.failed") {
        turnFailure = event.error;
        break;
      }
    }
    if (turnFailure) {
      throw new Error(turnFailure.message);
    }
    return { items, finalResponse, usage };
  }
};
function normalizeInput(input) {
  if (typeof input === "string") {
    return { prompt: input, images: [] };
  }
  const promptParts = [];
  const images = [];
  for (const item of input) {
    if (item.type === "text") {
      promptParts.push(item.text);
    } else if (item.type === "local_image") {
      images.push(item.path);
    }
  }
  return { prompt: promptParts.join("\n\n"), images };
}
var INTERNAL_ORIGINATOR_ENV = "CODEX_INTERNAL_ORIGINATOR_OVERRIDE";
var TYPESCRIPT_SDK_ORIGINATOR = "codex_sdk_ts";
var CODEX_NPM_NAME = "@openai/codex";
var PLATFORM_PACKAGE_BY_TARGET = {
  "x86_64-unknown-linux-musl": "@openai/codex-linux-x64",
  "aarch64-unknown-linux-musl": "@openai/codex-linux-arm64",
  "x86_64-apple-darwin": "@openai/codex-darwin-x64",
  "aarch64-apple-darwin": "@openai/codex-darwin-arm64",
  "x86_64-pc-windows-msvc": "@openai/codex-win32-x64",
  "aarch64-pc-windows-msvc": "@openai/codex-win32-arm64"
};
var moduleRequire = createRequire(import.meta.url);
var CodexExec = class {
  executablePath;
  envOverride;
  configOverrides;
  constructor(executablePath = null, env, configOverrides) {
    this.executablePath = executablePath || findCodexPath();
    this.envOverride = env;
    this.configOverrides = configOverrides;
  }
  async *run(args) {
    const commandArgs = ["exec", "--experimental-json"];
    if (this.configOverrides) {
      for (const override of serializeConfigOverrides(this.configOverrides)) {
        commandArgs.push("--config", override);
      }
    }
    if (args.baseUrl) {
      commandArgs.push(
        "--config",
        `openai_base_url=${toTomlValue(args.baseUrl, "openai_base_url")}`
      );
    }
    if (args.model) {
      commandArgs.push("--model", args.model);
    }
    if (args.sandboxMode) {
      commandArgs.push("--sandbox", args.sandboxMode);
    }
    if (args.workingDirectory) {
      commandArgs.push("--cd", args.workingDirectory);
    }
    if (args.additionalDirectories?.length) {
      for (const dir of args.additionalDirectories) {
        commandArgs.push("--add-dir", dir);
      }
    }
    if (args.skipGitRepoCheck) {
      commandArgs.push("--skip-git-repo-check");
    }
    if (args.outputSchemaFile) {
      commandArgs.push("--output-schema", args.outputSchemaFile);
    }
    if (args.modelReasoningEffort) {
      commandArgs.push("--config", `model_reasoning_effort="${args.modelReasoningEffort}"`);
    }
    if (args.networkAccessEnabled !== void 0) {
      commandArgs.push(
        "--config",
        `sandbox_workspace_write.network_access=${args.networkAccessEnabled}`
      );
    }
    if (args.webSearchMode) {
      commandArgs.push("--config", `web_search="${args.webSearchMode}"`);
    } else if (args.webSearchEnabled === true) {
      commandArgs.push("--config", `web_search="live"`);
    } else if (args.webSearchEnabled === false) {
      commandArgs.push("--config", `web_search="disabled"`);
    }
    if (args.approvalPolicy) {
      commandArgs.push("--config", `approval_policy="${args.approvalPolicy}"`);
    }
    if (args.threadId) {
      commandArgs.push("resume", args.threadId);
    }
    if (args.images?.length) {
      for (const image of args.images) {
        commandArgs.push("--image", image);
      }
    }
    const env = {};
    if (this.envOverride) {
      Object.assign(env, this.envOverride);
    } else {
      for (const [key, value] of Object.entries(process.env)) {
        if (value !== void 0) {
          env[key] = value;
        }
      }
    }
    if (!env[INTERNAL_ORIGINATOR_ENV]) {
      env[INTERNAL_ORIGINATOR_ENV] = TYPESCRIPT_SDK_ORIGINATOR;
    }
    if (args.apiKey) {
      env.CODEX_API_KEY = args.apiKey;
    }
    const child = spawn(this.executablePath, commandArgs, {
      env,
      signal: args.signal
    });
    let spawnError = null;
    child.once("error", (err) => spawnError = err);
    if (!child.stdin) {
      child.kill();
      throw new Error("Child process has no stdin");
    }
    child.stdin.write(args.input);
    child.stdin.end();
    if (!child.stdout) {
      child.kill();
      throw new Error("Child process has no stdout");
    }
    const stderrChunks = [];
    if (child.stderr) {
      child.stderr.on("data", (data) => {
        stderrChunks.push(data);
      });
    }
    const exitPromise = new Promise(
      (resolve) => {
        child.once("exit", (code, signal) => {
          resolve({ code, signal });
        });
      }
    );
    const rl2 = readline.createInterface({
      input: child.stdout,
      crlfDelay: Infinity
    });
    try {
      for await (const line of rl2) {
        yield line;
      }
      if (spawnError) throw spawnError;
      const { code, signal } = await exitPromise;
      if (code !== 0 || signal) {
        const stderrBuffer = Buffer.concat(stderrChunks);
        const detail = signal ? `signal ${signal}` : `code ${code ?? 1}`;
        throw new Error(`Codex Exec exited with ${detail}: ${stderrBuffer.toString("utf8")}`);
      }
    } finally {
      rl2.close();
      child.removeAllListeners();
      try {
        if (!child.killed) child.kill();
      } catch {
      }
    }
  }
};
function serializeConfigOverrides(configOverrides) {
  const overrides = [];
  flattenConfigOverrides(configOverrides, "", overrides);
  return overrides;
}
function flattenConfigOverrides(value, prefix, overrides) {
  if (!isPlainObject(value)) {
    if (prefix) {
      overrides.push(`${prefix}=${toTomlValue(value, prefix)}`);
      return;
    } else {
      throw new Error("Codex config overrides must be a plain object");
    }
  }
  const entries = Object.entries(value);
  if (!prefix && entries.length === 0) {
    return;
  }
  if (prefix && entries.length === 0) {
    overrides.push(`${prefix}={}`);
    return;
  }
  for (const [key, child] of entries) {
    if (!key) {
      throw new Error("Codex config override keys must be non-empty strings");
    }
    if (child === void 0) {
      continue;
    }
    const path32 = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(child)) {
      flattenConfigOverrides(child, path32, overrides);
    } else {
      overrides.push(`${path32}=${toTomlValue(child, path32)}`);
    }
  }
}
function toTomlValue(value, path32) {
  if (typeof value === "string") {
    return JSON.stringify(value);
  } else if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Codex config override at ${path32} must be a finite number`);
    }
    return `${value}`;
  } else if (typeof value === "boolean") {
    return value ? "true" : "false";
  } else if (Array.isArray(value)) {
    const rendered = value.map((item, index) => toTomlValue(item, `${path32}[${index}]`));
    return `[${rendered.join(", ")}]`;
  } else if (isPlainObject(value)) {
    const parts = [];
    for (const [key, child] of Object.entries(value)) {
      if (!key) {
        throw new Error("Codex config override keys must be non-empty strings");
      }
      if (child === void 0) {
        continue;
      }
      parts.push(`${formatTomlKey(key)} = ${toTomlValue(child, `${path32}.${key}`)}`);
    }
    return `{${parts.join(", ")}}`;
  } else if (value === null) {
    throw new Error(`Codex config override at ${path32} cannot be null`);
  } else {
    const typeName = typeof value;
    throw new Error(`Unsupported Codex config override value at ${path32}: ${typeName}`);
  }
}
var TOML_BARE_KEY = /^[A-Za-z0-9_-]+$/;
function formatTomlKey(key) {
  return TOML_BARE_KEY.test(key) ? key : JSON.stringify(key);
}
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function findCodexPath() {
  const { platform, arch } = process;
  let targetTriple = null;
  switch (platform) {
    case "linux":
    case "android":
      switch (arch) {
        case "x64":
          targetTriple = "x86_64-unknown-linux-musl";
          break;
        case "arm64":
          targetTriple = "aarch64-unknown-linux-musl";
          break;
        default:
          break;
      }
      break;
    case "darwin":
      switch (arch) {
        case "x64":
          targetTriple = "x86_64-apple-darwin";
          break;
        case "arm64":
          targetTriple = "aarch64-apple-darwin";
          break;
        default:
          break;
      }
      break;
    case "win32":
      switch (arch) {
        case "x64":
          targetTriple = "x86_64-pc-windows-msvc";
          break;
        case "arm64":
          targetTriple = "aarch64-pc-windows-msvc";
          break;
        default:
          break;
      }
      break;
    default:
      break;
  }
  if (!targetTriple) {
    throw new Error(`Unsupported platform: ${platform} (${arch})`);
  }
  const platformPackage = PLATFORM_PACKAGE_BY_TARGET[targetTriple];
  if (!platformPackage) {
    throw new Error(`Unsupported target triple: ${targetTriple}`);
  }
  let vendorRoot;
  try {
    const codexPackageJsonPath = moduleRequire.resolve(`${CODEX_NPM_NAME}/package.json`);
    const codexRequire = createRequire(codexPackageJsonPath);
    const platformPackageJsonPath = codexRequire.resolve(`${platformPackage}/package.json`);
    vendorRoot = path2.join(path2.dirname(platformPackageJsonPath), "vendor");
  } catch {
    throw new Error(
      `Unable to locate Codex CLI binaries. Ensure ${CODEX_NPM_NAME} is installed with optional dependencies.`
    );
  }
  const archRoot = path2.join(vendorRoot, targetTriple);
  const codexBinaryName = process.platform === "win32" ? "codex.exe" : "codex";
  const binaryPath = path2.join(archRoot, "codex", codexBinaryName);
  return binaryPath;
}
var Codex = class {
  exec;
  options;
  constructor(options = {}) {
    const { codexPathOverride, env, config } = options;
    this.exec = new CodexExec(codexPathOverride, env, config);
    this.options = options;
  }
  /**
   * Starts a new conversation with an agent.
   * @returns A new thread instance.
   */
  startThread(options = {}) {
    return new Thread(this.exec, this.options, options);
  }
  /**
   * Resumes a conversation with an agent based on the thread id.
   * Threads are persisted in ~/.codex/sessions.
   *
   * @param id The id of the thread to resume.
   * @returns A new thread instance.
   */
  resumeThread(id, options = {}) {
    return new Thread(this.exec, this.options, options, id);
  }
};

// src/index.ts
import { createInterface } from "node:readline";
import fs2 from "node:fs";
import os2 from "node:os";
import path3 from "node:path";
import process3 from "node:process";

// src/claudeEnv.ts
import process2 from "node:process";
var CLAUDE_DESKTOP_CLIENT_APP = "ccem-desktop";
var CLAUDE_NON_INTERACTIVE_SANDBOX = "1";
function buildClaudeQueryEnv({
  envVars,
  effort,
  baseEnv = process2.env
} = {}) {
  const env = {
    ...baseEnv,
    ...envVars,
    CLAUDE_AGENT_SDK_CLIENT_APP: CLAUDE_DESKTOP_CLIENT_APP,
    CLAUDE_CODE_SANDBOXED: CLAUDE_NON_INTERACTIVE_SANDBOX
  };
  if (effort) {
    env.CLAUDE_CODE_EFFORT_LEVEL = effort;
  }
  return env;
}

// src/permissionModes.ts
function normalizeClaudePermissionMode(permMode) {
  switch (permMode) {
    case "yolo":
    case "bypassPermissions":
      return {
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true
      };
    case "dev":
    case "acceptEdits":
      return {
        permissionMode: "acceptEdits",
        allowDangerouslySkipPermissions: false
      };
    case "readonly":
    case "audit":
    case "plan":
      return {
        permissionMode: "plan",
        allowDangerouslySkipPermissions: false
      };
    case "safe":
    case "ci":
    case "default":
      return {
        permissionMode: "default",
        allowDangerouslySkipPermissions: false
      };
    case "dontAsk":
      return {
        permissionMode: "dontAsk",
        allowDangerouslySkipPermissions: false
      };
    case "auto":
      return {
        permissionMode: "auto",
        allowDangerouslySkipPermissions: false
      };
    default:
      return {
        permissionMode: "default",
        allowDangerouslySkipPermissions: false
      };
  }
}
function normalizeCodexSandboxMode(permMode) {
  if (permMode === "yolo" || permMode === "danger-full-access") {
    return {
      sandboxMode: "danger-full-access",
      approvalPolicy: "never"
    };
  }
  if (permMode === "readonly" || permMode === "audit" || permMode === "ci" || permMode === "plan" || permMode === "read-only") {
    return {
      sandboxMode: "read-only",
      approvalPolicy: "never"
    };
  }
  return {
    sandboxMode: "workspace-write",
    approvalPolicy: "on-request"
  };
}

// src/claudePermissionControl.ts
async function applyClaudePermissionModeToQuery(query, permMode) {
  const permission = normalizeClaudePermissionMode(permMode);
  if (query) {
    await query.setPermissionMode(permission.permissionMode);
  }
  return permission;
}

// src/promptContent.ts
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function defaultImagePlaceholder(index) {
  return `[Image #${index + 1}]`;
}
function pushTextPart(parts, text) {
  const trimmed = text.trim();
  if (trimmed) {
    parts.push({ type: "text", text: trimmed });
  }
}
function buildPromptContentParts(text, images) {
  const trimmedText = text.trim();
  const promptImages = images?.filter((image) => image.base64Data.trim()) ?? [];
  if (promptImages.length === 0) {
    return trimmedText ? [{ type: "text", text: trimmedText }] : [];
  }
  if (!trimmedText) {
    return promptImages.map((image) => ({ type: "image", image }));
  }
  const occurrences = [];
  for (const [imageIndex, image] of promptImages.entries()) {
    const candidates = Array.from(new Set([
      image.placeholder?.trim() || null,
      defaultImagePlaceholder(imageIndex)
    ].filter((candidate) => Boolean(candidate))));
    let best = null;
    for (const candidate of candidates) {
      const match = new RegExp(escapeRegExp(candidate)).exec(trimmedText);
      if (!match || match.index == null) {
        continue;
      }
      const occurrence = {
        start: match.index,
        end: match.index + candidate.length
      };
      if (!best || occurrence.start < best.start) {
        best = occurrence;
      }
    }
    if (best) {
      occurrences.push({ imageIndex, ...best });
    }
  }
  occurrences.sort((a2, b10) => a2.start - b10.start || a2.end - b10.end);
  const parts = [];
  const usedImageIndexes = /* @__PURE__ */ new Set();
  let cursor = 0;
  for (const occurrence of occurrences) {
    if (usedImageIndexes.has(occurrence.imageIndex) || occurrence.start < cursor) {
      continue;
    }
    pushTextPart(parts, trimmedText.slice(cursor, occurrence.start));
    parts.push({ type: "image", image: promptImages[occurrence.imageIndex] });
    usedImageIndexes.add(occurrence.imageIndex);
    cursor = occurrence.end;
  }
  pushTextPart(parts, trimmedText.slice(cursor));
  for (const [imageIndex, image] of promptImages.entries()) {
    if (!usedImageIndexes.has(imageIndex)) {
      parts.push({ type: "image", image });
    }
  }
  return parts;
}

// src/index.ts
var initCommand = null;
var stopped = false;
var activeTurn = false;
var currentProviderSessionId = null;
var currentAbortController = null;
var currentClaudeQuery = null;
var claudeInputQueue = null;
var claudeConsumeLoop = null;
var claudeLastSessionState = null;
var claudeSawPartialText = false;
var claudeSawPartialThinking = false;
var claudeTurnCompletionEmitted = false;
var codexClient = null;
var codexThread = null;
var pendingSettings = null;
var promptQueue = [];
var pendingPermissions = /* @__PURE__ */ new Map();
var pendingClaudeInteractivePrompts = /* @__PURE__ */ new Map();
var startedToolNames = /* @__PURE__ */ new Map();
var completedToolUseIds = /* @__PURE__ */ new Set();
var AsyncMessageQueue = class {
  items = [];
  resolvers = [];
  closed = false;
  push(item) {
    if (this.closed) {
      throw new Error("Message queue is closed");
    }
    const resolver = this.resolvers.shift();
    if (resolver) {
      resolver({ value: item, done: false });
      return;
    }
    this.items.push(item);
  }
  close() {
    this.closed = true;
    while (this.resolvers.length > 0) {
      this.resolvers.shift()?.({ value: void 0, done: true });
    }
  }
  async *[Symbol.asyncIterator]() {
    while (true) {
      if (this.items.length > 0) {
        yield this.items.shift();
        continue;
      }
      if (this.closed) {
        return;
      }
      const next = await new Promise((resolve) => {
        this.resolvers.push(resolve);
      });
      if (next.done) {
        return;
      }
      yield next.value;
    }
  }
};
function emit(output) {
  process3.stdout.write(`${JSON.stringify(output)}
`);
}
function emitStatus(status, detail) {
  emit({ type: "status", status, detail });
}
function emitEvent(payload) {
  emit({ type: "event", payload });
}
function emitSessionMeta(providerSessionId) {
  if (!providerSessionId) {
    return;
  }
  currentProviderSessionId = providerSessionId;
  emit({ type: "session_meta", provider_session_id: providerSessionId });
}
function toolCategory(rawName, category) {
  const normalized = category ?? "unknown";
  return {
    category: normalized,
    raw_name: rawName
  };
}
function userInputToolCategory(rawName, kind) {
  return {
    category: "user_input",
    kind,
    raw_name: rawName
  };
}
function isClaudeInteractiveUserInputTool(name) {
  return categorizeClaudeTool(name).category === "user_input";
}
function summarizeUnknown(value) {
  if (typeof value === "string") {
    return value;
  }
  if (value == null) {
    return "";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
function compactJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
function truncateSummary(value, maxLength = 160) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "";
  }
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 1).trimEnd()}\u2026`;
}
function getClaudeContentBlocks(message) {
  const content = message?.content;
  if (!Array.isArray(content)) {
    return [];
  }
  return content;
}
function resetClaudeTurnTracking() {
  claudeSawPartialText = false;
  claudeSawPartialThinking = false;
  claudeTurnCompletionEmitted = false;
}
function categorizeClaudeTool(name) {
  if (name.includes("AskUser") || name.includes("Question")) {
    return userInputToolCategory(name, "question");
  }
  if (name.includes("PlanMode") && name.includes("Enter")) {
    return userInputToolCategory(name, "plan_entry");
  }
  if (name.includes("PlanMode") && name.includes("Exit")) {
    return userInputToolCategory(name, "plan_exit");
  }
  switch (name) {
    case "Bash":
    case "BashOutput":
    case "KillShell":
      return toolCategory(name, "execution");
    case "Read":
    case "Write":
    case "Edit":
    case "MultiEdit":
    case "NotebookEdit":
      return toolCategory(name, "file_op");
    case "Glob":
    case "Grep":
    case "LSP":
    case "WebFetch":
    case "WebSearch":
    case "ToolSearch":
      return toolCategory(name, "search");
    default:
      if (name.includes("Task") || name.includes("Todo")) {
        return toolCategory(name, "task_mgmt");
      }
      return toolCategory(name, "unknown");
  }
}
function summarizeQuestionInput(input) {
  const questions = Array.isArray(input.questions) ? input.questions : [];
  const firstQuestion = questions[0];
  if (!firstQuestion || typeof firstQuestion !== "object") {
    return null;
  }
  const questionText = typeof firstQuestion.question === "string" ? firstQuestion.question.trim() : "";
  if (!questionText) {
    return null;
  }
  return truncateSummary(`\u9700\u8981\u7528\u6237\u56DE\u7B54 ${questions.length} \u4E2A\u95EE\u9898\uFF1A${questionText}`);
}
function extractStringField(input, keys) {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}
function summarizeClaudeToolInput(toolName, input, options) {
  const questionSummary = summarizeQuestionInput(input);
  if (questionSummary) {
    return questionSummary;
  }
  if (toolName.includes("PlanMode") && toolName.includes("Exit")) {
    const planSummary = extractStringField(input, ["plan"]);
    if (planSummary) {
      return truncateSummary(planSummary);
    }
  }
  if (toolName === "Bash") {
    const command = extractStringField(input, ["command"]);
    if (command) {
      return truncateSummary(command);
    }
  }
  const pathLikeValue = extractStringField(input, [
    "file_path",
    "path",
    "target_file",
    "pattern",
    "query"
  ]);
  if (pathLikeValue) {
    return truncateSummary(pathLikeValue);
  }
  const displayReason = [
    options?.title,
    options?.description,
    options?.blockedPath,
    options?.decisionReason
  ].find((value) => typeof value === "string" && value.trim().length > 0);
  if (displayReason) {
    return truncateSummary(displayReason);
  }
  return truncateSummary(compactJson(input));
}
function parseClaudeInteractiveToolPrompt(name, input) {
  if (name.includes("AskUser") || name.includes("Question")) {
    const questions = Array.isArray(input.questions) ? input.questions.map((value) => {
      if (!value || typeof value !== "object" || typeof value.question !== "string") {
        return null;
      }
      const options = Array.isArray(value.options) ? value.options.map((option) => {
        if (!option || typeof option !== "object" || typeof option.label !== "string") {
          return null;
        }
        const label = option.label.trim();
        if (!label) {
          return null;
        }
        return {
          label,
          description: typeof option.description === "string" && option.description.trim() ? option.description.trim() : void 0,
          preview: typeof option.preview === "string" && option.preview.trim() ? option.preview.trim() : void 0
        };
      }).filter((option) => Boolean(option)) : [];
      return {
        question: value.question.trim(),
        header: typeof value.header === "string" && value.header.trim() ? value.header.trim() : void 0,
        multiSelect: value.multiSelect === true,
        options
      };
    }).filter((question) => Boolean(question)) : [];
    return {
      prompt_type: "ask_user_question",
      questions
    };
  }
  if (name.includes("PlanMode") && name.includes("Enter")) {
    return {
      prompt_type: "plan_entry"
    };
  }
  if (name.includes("PlanMode") && name.includes("Exit")) {
    const allowedPrompts = Array.isArray(input.allowedPrompts) ? input.allowedPrompts.filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean) : [];
    const planSummary = extractStringField(input, ["plan"]);
    return {
      prompt_type: "plan_exit",
      allowed_prompts: allowedPrompts,
      plan_summary: planSummary || void 0
    };
  }
  return void 0;
}
function emitClaudeToolUseStarted(payload) {
  if (!payload.toolUseId || startedToolNames.has(payload.toolUseId)) {
    return;
  }
  startedToolNames.set(payload.toolUseId, payload.rawName);
  emitEvent({
    type: "tool_use_started",
    tool_use_id: payload.toolUseId,
    category: categorizeClaudeTool(payload.rawName),
    raw_name: payload.rawName,
    input_summary: payload.inputSummary,
    needs_response: payload.needsResponse,
    ...payload.prompt ? { prompt: payload.prompt } : {}
  });
}
function emitClaudeToolUseCompleted(toolUseId, resultSummary, success) {
  if (!toolUseId || completedToolUseIds.has(toolUseId)) {
    return;
  }
  completedToolUseIds.add(toolUseId);
  const rawName = startedToolNames.get(toolUseId) ?? "tool";
  startedToolNames.delete(toolUseId);
  emitEvent({
    type: "tool_use_completed",
    tool_use_id: toolUseId,
    raw_name: rawName,
    result_summary: resultSummary,
    success
  });
}
function summarizeClaudeToolResult(block) {
  const content = block.content;
  if (typeof content === "string" && content.trim()) {
    return truncateSummary(content);
  }
  if (Array.isArray(content)) {
    const text = content.map((entry) => {
      if (typeof entry === "string") {
        return entry.trim();
      }
      if (entry && typeof entry === "object" && typeof entry.text === "string") {
        return entry.text.trim();
      }
      return "";
    }).filter(Boolean).join("\n");
    if (text) {
      return truncateSummary(text);
    }
  }
  if (content && typeof content === "object" && typeof content.text === "string" && content.text.trim()) {
    return truncateSummary(content.text);
  }
  return truncateSummary(compactJson(content ?? block));
}
function buildAllowedClaudeToolResult(input, toolUseId) {
  return {
    behavior: "allow",
    updatedInput: input,
    toolUseID: toolUseId
  };
}
function isClaudeAskUserQuestionTool(name) {
  const category = categorizeClaudeTool(name);
  return category.category === "user_input" && category.kind === "question";
}
function buildAskUserQuestionUpdatedInput(input, answers, annotations) {
  const updatedInput = {
    ...input,
    answers
  };
  if (annotations && Object.keys(annotations).length > 0) {
    updatedInput.annotations = annotations;
  }
  return updatedInput;
}
function summarizeAskUserQuestionAnswers(answers, annotations) {
  const parts = Object.entries(answers).map(([question, answer]) => {
    const trimmedQuestion = question.trim();
    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer) {
      return null;
    }
    const note = annotations?.[question]?.notes?.trim();
    const base = trimmedQuestion ? `"${trimmedQuestion}"="${trimmedAnswer}"` : `"${trimmedAnswer}"`;
    return note ? `${base} user notes: ${note}` : base;
  }).filter((value) => Boolean(value));
  if (parts.length === 0) {
    return "User answered AskUserQuestion.";
  }
  return truncateSummary(
    `User has answered your questions: ${parts.join(", ")}. You can now continue with the user's answers in mind.`,
    240
  );
}
async function waitForAskUserQuestionResponse(input, toolUseId) {
  return await new Promise((resolve) => {
    pendingClaudeInteractivePrompts.set(toolUseId, {
      input,
      resolve
    });
  });
}
async function waitForPermission(toolName, input, options) {
  const toolUseId = options.toolUseID;
  const requestId = `${toolUseId}:${Date.now()}`;
  const inputSummary = summarizeClaudeToolInput(toolName, input, options);
  emitClaudeToolUseStarted({
    toolUseId,
    rawName: toolName,
    inputSummary,
    needsResponse: false
  });
  emitEvent({
    type: "permission_required",
    request_id: requestId,
    tool_name: options.displayName || toolName,
    input_summary: inputSummary
  });
  const approved = await new Promise((resolve) => {
    pendingPermissions.set(requestId, { resolve });
  });
  emitEvent({
    type: "permission_responded",
    request_id: requestId,
    approved,
    responder: "desktop"
  });
  if (!approved) {
    emitClaudeToolUseCompleted(toolUseId, "Permission denied in desktop workspace.", false);
  }
  return approved ? buildAllowedClaudeToolResult(input, toolUseId) : { behavior: "deny", message: "Permission denied in desktop workspace.", toolUseID: toolUseId };
}
function handleClaudePartialEvent(rawEvent) {
  if (rawEvent.type === "message_start") {
    resetClaudeTurnTracking();
    return;
  }
  if (rawEvent.type !== "content_block_delta") {
    return;
  }
  const delta = rawEvent.delta;
  if (!delta || typeof delta.type !== "string") {
    return;
  }
  if (delta.type === "text_delta" && typeof delta.text === "string" && delta.text) {
    claudeSawPartialText = true;
    emitEvent({
      type: "assistant_chunk",
      text: delta.text
    });
    return;
  }
  if (delta.type === "thinking_delta" && typeof delta.thinking === "string" && delta.thinking) {
    claudeSawPartialThinking = true;
    emitEvent({
      type: "system_message",
      message: delta.thinking
    });
  }
}
function handleClaudeCompactBoundary(message) {
  const metadata = message.compact_metadata && typeof message.compact_metadata === "object" ? message.compact_metadata : {};
  const trigger = typeof metadata.trigger === "string" ? metadata.trigger : void 0;
  const preTokens = typeof metadata.pre_tokens === "number" ? metadata.pre_tokens : void 0;
  const postTokens = typeof metadata.post_tokens === "number" ? metadata.post_tokens : void 0;
  const parts = ["Claude compacted the context."];
  if (trigger === "manual" || trigger === "auto") {
    parts.push(`trigger=${trigger}`);
  }
  if (preTokens !== void 0) {
    parts.push(`pre_tokens=${preTokens}`);
  }
  if (postTokens !== void 0) {
    parts.push(`post_tokens=${postTokens}`);
  }
  emitEvent({
    type: "lifecycle",
    stage: "compact_completed",
    detail: parts.join(" ")
  });
}
function handleClaudeStatusMessage(message) {
  const compactResult = message.compact_result;
  if (compactResult === "success") {
    emitEvent({
      type: "lifecycle",
      stage: "compact_completed",
      detail: "Claude compacted the context."
    });
    return true;
  }
  if (compactResult === "failed") {
    const compactError = typeof message.compact_error === "string" && message.compact_error.trim() ? message.compact_error.trim() : "Claude failed to compact the context.";
    emitEvent({
      type: "lifecycle",
      stage: "compact_failed",
      detail: compactError
    });
    return true;
  }
  if (message.status === "compacting") {
    emitEvent({
      type: "lifecycle",
      stage: "compacting",
      detail: "Claude is compacting the context."
    });
    return true;
  }
  return false;
}
function applySettingsToInitCommand(settings) {
  if (!initCommand) return false;
  if (settings.permMode !== void 0) initCommand.perm_mode = settings.permMode;
  if (settings.envVars !== void 0) initCommand.env_vars = settings.envVars;
  if (settings.envName !== void 0) initCommand.env_name = settings.envName;
  if (settings.effort !== void 0) initCommand.effort = settings.effort || void 0;
  return true;
}
function applyPendingSettingsToInitCommand() {
  if (!pendingSettings) return false;
  const settings = pendingSettings;
  pendingSettings = null;
  return applySettingsToInitCommand(settings);
}
function applySettingsCommand(command) {
  return applySettingsToInitCommand({
    envName: command.env_name,
    permMode: command.perm_mode,
    envVars: command.env_vars,
    effort: command.effort
  });
}
function queuePendingSettings(command) {
  pendingSettings = {
    ...pendingSettings,
    ...command.env_name !== void 0 ? { envName: command.env_name } : {},
    ...command.perm_mode !== void 0 ? { permMode: command.perm_mode } : {},
    ...command.env_vars !== void 0 ? { envVars: command.env_vars } : {},
    ...command.effort !== void 0 ? { effort: command.effort } : {}
  };
}
function isClaudePermissionOnlySettingsCommand(command) {
  return command.perm_mode !== void 0 && command.env_name === void 0 && command.env_vars === void 0 && command.effort === void 0;
}
async function applyClaudePermissionSettingsCommand(command) {
  if (!initCommand || initCommand.provider !== "claude" || !isClaudePermissionOnlySettingsCommand(command)) {
    return false;
  }
  await applyClaudePermissionModeToQuery(currentClaudeQuery, command.perm_mode);
  applySettingsCommand(command);
  return true;
}
function canApplySettingsImmediately() {
  if (!initCommand) return false;
  if (initCommand.provider === "codex") {
    return !activeTurn;
  }
  return claudeLastSessionState === "idle" || !claudeConsumeLoop;
}
function teardownClaudeSession() {
  claudeInputQueue?.close();
  currentClaudeQuery?.close();
  claudeInputQueue = null;
  currentClaudeQuery = null;
  claudeConsumeLoop = null;
  resetClaudeTurnTracking();
}
function teardownCodexSession(envChanged) {
  codexThread = null;
  if (envChanged) codexClient = null;
}
async function consumeClaudeMessages() {
  if (!initCommand) {
    throw new Error("Native runtime helper not initialized");
  }
  const permission = normalizeClaudePermissionMode(initCommand.perm_mode);
  const env = buildClaudeQueryEnv({
    envVars: initCommand.env_vars,
    effort: initCommand.effort
  });
  claudeInputQueue = new AsyncMessageQueue();
  currentClaudeQuery = E$$({
    prompt: claudeInputQueue,
    options: {
      cwd: initCommand.working_dir,
      env,
      resume: currentProviderSessionId ?? void 0,
      pathToClaudeCodeExecutable: initCommand.claude_path ?? void 0,
      includePartialMessages: true,
      includeHookEvents: true,
      persistSession: true,
      canUseTool: async (toolName, input, options) => {
        if (isClaudeAskUserQuestionTool(toolName)) {
          return waitForAskUserQuestionResponse(input, options.toolUseID);
        }
        if (isClaudeInteractiveUserInputTool(toolName)) {
          return buildAllowedClaudeToolResult(input, options.toolUseID);
        }
        return waitForPermission(toolName, input, options);
      },
      ...permission
    }
  });
  for await (const message of currentClaudeQuery) {
    const sessionId = message?.session_id;
    if (sessionId) {
      emitSessionMeta(sessionId);
    }
    if (message.type === "stream_event") {
      const event = message.event;
      if (event) {
        handleClaudePartialEvent(event);
      }
      continue;
    }
    if (message.type === "assistant") {
      const contentBlocks = getClaudeContentBlocks(message.message);
      const emittedThinking = /* @__PURE__ */ new Set();
      contentBlocks.forEach((block) => {
        if (block.type === "thinking" && typeof block.thinking === "string" && block.thinking) {
          const thinking = block.thinking.trim();
          if (!thinking || claudeSawPartialThinking || emittedThinking.has(thinking)) {
            return;
          }
          emittedThinking.add(thinking);
          emitEvent({
            type: "system_message",
            message: thinking
          });
          return;
        }
        if (block.type === "text" && typeof block.text === "string" && block.text && !claudeSawPartialText) {
          emitEvent({
            type: "assistant_chunk",
            text: block.text
          });
          return;
        }
        if (block.type === "tool_use" && typeof block.id === "string" && typeof block.name === "string" && block.name) {
          const input = block.input && typeof block.input === "object" ? block.input : {};
          const prompt = parseClaudeInteractiveToolPrompt(block.name, input);
          const category = categorizeClaudeTool(block.name);
          const needsResponse = category.category === "user_input" && (category.kind === "question" || category.kind === "plan_exit");
          emitClaudeToolUseStarted({
            toolUseId: block.id,
            rawName: block.name,
            inputSummary: summarizeClaudeToolInput(block.name, input),
            needsResponse,
            prompt
          });
        }
      });
      continue;
    }
    if (message.type === "user") {
      const contentBlocks = getClaudeContentBlocks(message.message);
      contentBlocks.forEach((block) => {
        if (block.type !== "tool_result" || typeof block.tool_use_id !== "string") {
          return;
        }
        emitClaudeToolUseCompleted(
          block.tool_use_id,
          summarizeClaudeToolResult(block),
          block.is_error !== true
        );
      });
      continue;
    }
    if (message.type === "tool_progress") {
      emitClaudeToolUseStarted({
        toolUseId: message.tool_use_id,
        rawName: message.tool_name,
        inputSummary: `Running ${message.tool_name}`,
        needsResponse: false
      });
      continue;
    }
    if (message.type === "tool_use_summary") {
      for (const toolUseId of message.preceding_tool_use_ids) {
        emitClaudeToolUseCompleted(toolUseId, message.summary, true);
      }
      continue;
    }
    if (message.type === "system" && message.subtype === "compact_boundary") {
      handleClaudeCompactBoundary(message);
      continue;
    }
    if (message.type === "system" && message.subtype === "status") {
      if (handleClaudeStatusMessage(message)) {
        continue;
      }
      const statusLabel = message.status || "idle";
      emitEvent({
        type: "lifecycle",
        stage: "status",
        detail: `Claude status: ${statusLabel}`
      });
      continue;
    }
    if (message.type === "system" && message.subtype === "session_state_changed") {
      if (message.state !== claudeLastSessionState) {
        if (message.state === "running") {
          claudeTurnCompletionEmitted = false;
          emitEvent({
            type: "lifecycle",
            stage: "turn_started",
            detail: "Claude is processing a turn."
          });
          emitStatus("processing", "Claude is processing a turn.");
        }
        if (message.state === "idle" && !claudeTurnCompletionEmitted) {
          claudeTurnCompletionEmitted = true;
          emitEvent({
            type: "lifecycle",
            stage: "turn_completed",
            detail: "Claude turn completed."
          });
          emitStatus("ready", "Ready for the next prompt.");
        }
      }
      claudeLastSessionState = message.state;
      if (message.state === "idle" && pendingSettings) {
        applyPendingSettingsToInitCommand();
        teardownClaudeSession();
        emitStatus("ready", "Settings applied.");
        return;
      }
      continue;
    }
    if (message.type === "result") {
      if (message.subtype === "success") {
        if (!claudeTurnCompletionEmitted) {
          claudeTurnCompletionEmitted = true;
          emitEvent({
            type: "lifecycle",
            stage: "turn_completed",
            detail: message.result || "Claude turn completed."
          });
          emitStatus("ready", "Ready for the next prompt.");
        }
      } else {
        emitEvent({
          type: "session_completed",
          reason: message.errors?.join("\n") || message.subtype
        });
      }
      continue;
    }
    if (message.type === "auth_status" && message.error) {
      emitEvent({
        type: "stderr_line",
        line: message.error
      });
    }
  }
}
async function ensureClaudeSession() {
  if (!initCommand) {
    throw new Error("Native runtime helper not initialized");
  }
  if (initCommand.provider !== "claude") {
    return;
  }
  if (!claudeConsumeLoop) {
    claudeConsumeLoop = consumeClaudeMessages().catch((error) => {
      const isAbort = error instanceof Error && error.name === "AbortError";
      if (stopped || isAbort) {
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      emitEvent({
        type: "stderr_line",
        line: message
      });
      emitEvent({
        type: "session_completed",
        reason: message
      });
      emitStatus("error", message);
    });
  }
}
function enqueueClaudePrompt(text, images) {
  if (!claudeInputQueue) {
    throw new Error("Claude streaming input queue is not ready");
  }
  const parts = buildPromptContentParts(text, images);
  const hasImages = parts.some((part) => part.type === "image");
  const content = hasImages ? parts.map((part) => {
    if (part.type === "text") {
      return { type: "text", text: part.text };
    }
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: part.image.mediaType,
        data: part.image.base64Data
      }
    };
  }) : text.trim();
  resetClaudeTurnTracking();
  claudeInputQueue.push({
    type: "user",
    message: {
      role: "user",
      content
    },
    parent_tool_use_id: null
  });
  emitStatus("processing", "Claude is processing a turn.");
}
function codexCategoryForItem(item) {
  switch (item.type) {
    case "command_execution":
      return toolCategory(String(item.command || "command"), "execution");
    case "file_change":
      return toolCategory("file_change", "file_op");
    case "web_search":
      return toolCategory("web_search", "search");
    case "todo_list":
      return toolCategory("todo_list", "task_mgmt");
    default:
      return toolCategory(String(item.type || "item"), "unknown");
  }
}
function summarizeCodexItem(item) {
  if (typeof item.text === "string") {
    return item.text;
  }
  if (typeof item.command === "string") {
    return item.command;
  }
  if (Array.isArray(item.changes)) {
    return `${item.changes.length} file changes`;
  }
  if (typeof item.query === "string") {
    return item.query;
  }
  return summarizeUnknown(item);
}
async function ensureCodexThread() {
  if (!initCommand) {
    throw new Error("Native runtime helper not initialized");
  }
  if (!codexClient) {
    codexClient = new Codex({
      codexPathOverride: initCommand.codex_path ?? void 0,
      baseUrl: initCommand.codex_base_url ?? void 0,
      apiKey: initCommand.codex_api_key ?? void 0,
      env: {
        ...process3.env,
        ...initCommand.env_vars
      }
    });
  }
  if (!codexThread) {
    const sandbox = normalizeCodexSandboxMode(initCommand.perm_mode);
    const threadOptions = {
      workingDirectory: initCommand.working_dir,
      networkAccessEnabled: true,
      skipGitRepoCheck: true,
      ...sandbox,
      ...initCommand.effort ? { modelReasoningEffort: initCommand.effort } : {}
    };
    codexThread = currentProviderSessionId ? codexClient.resumeThread(currentProviderSessionId, threadOptions) : codexClient.startThread(threadOptions);
    if (currentProviderSessionId) {
      emitSessionMeta(currentProviderSessionId);
    }
  }
  return codexThread;
}
async function runCodexTurn(text, images) {
  const thread = await ensureCodexThread();
  currentAbortController = new AbortController();
  let input;
  const parts = buildPromptContentParts(text, images);
  const hasImages = parts.some((part) => part.type === "image");
  if (hasImages) {
    const tempDir = path3.join(os2.tmpdir(), "ccem-images");
    fs2.mkdirSync(tempDir, { recursive: true });
    const inputParts = [];
    for (const part of parts) {
      if (part.type === "text") {
        inputParts.push({ type: "text", text: part.text });
        continue;
      }
      const ext = part.image.mediaType.split("/")[1] || "png";
      const filename = `paste-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const filePath = path3.join(tempDir, filename);
      fs2.writeFileSync(filePath, Buffer.from(part.image.base64Data, "base64"));
      inputParts.push({ type: "local_image", path: filePath });
    }
    input = inputParts;
  } else {
    input = text.trim();
  }
  const streamed = await thread.runStreamed(input, {
    signal: currentAbortController.signal
  });
  const seenTextByItem = /* @__PURE__ */ new Map();
  const seenReasoningByItem = /* @__PURE__ */ new Map();
  for await (const event of streamed.events) {
    if (event.type === "thread.started") {
      emitSessionMeta(event.thread_id);
      continue;
    }
    if (event.type === "turn.started") {
      emitEvent({
        type: "lifecycle",
        stage: "turn_started",
        detail: "Codex is thinking\u2026"
      });
      continue;
    }
    if (event.type === "turn.completed") {
      emitEvent({
        type: "lifecycle",
        stage: "turn_completed",
        detail: `Turn completed \xB7 output ${event.usage.output_tokens} tokens`
      });
      continue;
    }
    if (event.type === "turn.failed") {
      emitEvent({
        type: "session_completed",
        reason: event.error.message
      });
      continue;
    }
    if (event.type === "error") {
      emitEvent({
        type: "stderr_line",
        line: event.message
      });
      continue;
    }
    const item = event.item;
    if (item.type === "agent_message") {
      const nextText = typeof item.text === "string" ? item.text : "";
      const previousText = seenTextByItem.get(String(item.id)) || "";
      if (nextText.startsWith(previousText)) {
        const delta = nextText.slice(previousText.length);
        if (delta) {
          emitEvent({
            type: "assistant_chunk",
            text: delta
          });
        }
      } else if (nextText) {
        emitEvent({
          type: "assistant_chunk",
          text: nextText
        });
      }
      seenTextByItem.set(String(item.id), nextText);
      continue;
    }
    if (item.type === "reasoning") {
      const itemId = String(item.id || "reasoning");
      const nextText = typeof item.text === "string" ? item.text : "";
      const previousText = seenReasoningByItem.get(itemId) || "";
      if (nextText.startsWith(previousText)) {
        const delta = nextText.slice(previousText.length);
        if (delta) {
          emitEvent({
            type: "system_message",
            message: delta
          });
        }
      } else if (nextText) {
        emitEvent({
          type: "system_message",
          message: nextText
        });
      }
      seenReasoningByItem.set(itemId, nextText);
      continue;
    }
    if (event.type === "item.started") {
      emitEvent({
        type: "tool_use_started",
        tool_use_id: String(item.id || `${item.type}-${Date.now()}`),
        category: codexCategoryForItem(item),
        raw_name: String(item.type || "item"),
        input_summary: summarizeCodexItem(item),
        needs_response: false
      });
      continue;
    }
    if (event.type === "item.completed") {
      emitEvent({
        type: "tool_use_completed",
        tool_use_id: String(item.id || `${item.type}-${Date.now()}`),
        raw_name: String(item.type || "item"),
        result_summary: summarizeCodexItem(item),
        success: item.status !== "failed"
      });
      continue;
    }
  }
}
async function runQueuedTurns() {
  if (activeTurn || !initCommand || stopped || initCommand.provider === "claude") {
    return;
  }
  const nextPrompt = promptQueue.shift();
  if (!nextPrompt) {
    return;
  }
  activeTurn = true;
  emitStatus("processing", "Codex is processing a turn.");
  try {
    await runCodexTurn(nextPrompt.text, nextPrompt.images);
    if (!stopped) {
      emitStatus("ready", "Ready for the next prompt.");
    }
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    if (!isAbort) {
      const message = error instanceof Error ? error.message : String(error);
      emitEvent({
        type: "stderr_line",
        line: message
      });
      emitEvent({
        type: "session_completed",
        reason: message
      });
      emitStatus("error", message);
    }
  } finally {
    activeTurn = false;
    currentAbortController = null;
    if (pendingSettings) {
      const hadEnvVars = pendingSettings.envVars !== void 0;
      applyPendingSettingsToInitCommand();
      teardownCodexSession(hadEnvVars);
      emitStatus("ready", "Settings applied.");
    }
    if (!stopped) {
      void runQueuedTurns();
    }
  }
}
async function handleCommand(command) {
  if (command.type === "init") {
    initCommand = command;
    currentProviderSessionId = command.provider_session_id ?? null;
    if (currentProviderSessionId) {
      emitSessionMeta(currentProviderSessionId);
    }
    emitStatus("ready", "Native runtime helper initialized.");
    const initialText = command.initial_prompt?.trim() ?? "";
    const initialImages = command.initial_images?.length ? command.initial_images : null;
    if (initialText || initialImages) {
      if (command.provider === "claude") {
        await ensureClaudeSession();
        enqueueClaudePrompt(initialText, initialImages);
      } else {
        promptQueue.push({ text: initialText, images: initialImages });
        await runQueuedTurns();
      }
    } else if (command.provider === "claude") {
      await ensureClaudeSession();
    }
    return;
  }
  if (command.type === "permission_response") {
    const pending = pendingPermissions.get(command.request_id);
    if (pending) {
      pendingPermissions.delete(command.request_id);
      pending.resolve(command.approved);
    }
    return;
  }
  if (command.type === "interactive_prompt_response") {
    const pending = pendingClaudeInteractivePrompts.get(command.tool_use_id);
    if (!pending) {
      return;
    }
    pendingClaudeInteractivePrompts.delete(command.tool_use_id);
    if (command.prompt_type !== "ask_user_question") {
      pending.resolve({
        behavior: "deny",
        message: "Unsupported interactive prompt response.",
        toolUseID: command.tool_use_id
      });
      return;
    }
    if (Object.keys(command.answers).length === 0) {
      pending.resolve({
        behavior: "deny",
        message: "User did not answer the question prompt.",
        toolUseID: command.tool_use_id
      });
      return;
    }
    emitClaudeToolUseCompleted(
      command.tool_use_id,
      summarizeAskUserQuestionAnswers(command.answers, command.annotations),
      true
    );
    pending.resolve(
      buildAllowedClaudeToolResult(
        buildAskUserQuestionUpdatedInput(
          pending.input,
          command.answers,
          command.annotations
        ),
        command.tool_use_id
      )
    );
    return;
  }
  if (command.type === "update_settings") {
    if (!initCommand) return;
    if (await applyClaudePermissionSettingsCommand(command)) {
      emitStatus("ready", "Settings applied.");
      return;
    }
    if (canApplySettingsImmediately()) {
      applySettingsCommand(command);
      if (initCommand.provider === "claude" && claudeConsumeLoop) {
        teardownClaudeSession();
      }
      if (initCommand.provider === "codex") {
        teardownCodexSession(command.env_vars !== void 0 || command.effort !== void 0);
      }
      emitStatus("ready", "Settings applied.");
    } else {
      queuePendingSettings(command);
      emitStatus("processing", "Settings will apply after the current turn.");
    }
    return;
  }
  if (command.type === "prompt") {
    const hasImages = command.images && command.images.length > 0;
    if (!command.text.trim() && !hasImages) {
      return;
    }
    if (initCommand?.provider === "claude") {
      await ensureClaudeSession();
      enqueueClaudePrompt(command.text.trim(), command.images);
    } else {
      promptQueue.push({ text: command.text.trim(), images: command.images });
      await runQueuedTurns();
    }
    return;
  }
  if (command.type === "stop") {
    stopped = true;
    currentAbortController?.abort();
    for (const [toolUseId, pending] of pendingClaudeInteractivePrompts.entries()) {
      pending.resolve({
        behavior: "deny",
        message: "Native runtime helper stopped before user responded.",
        toolUseID: toolUseId
      });
    }
    pendingClaudeInteractivePrompts.clear();
    claudeInputQueue?.close();
    currentClaudeQuery?.close();
    teardownClaudeSession();
    teardownCodexSession(false);
    activeTurn = false;
    currentAbortController = null;
    stopped = false;
    emitStatus("ready", "Turn interrupted. Ready for the next prompt.");
    return;
  }
}
var rl = createInterface({
  input: process3.stdin,
  crlfDelay: Infinity
});
rl.on("line", (line) => {
  if (!line.trim()) {
    return;
  }
  let command;
  try {
    command = JSON.parse(line);
  } catch (error) {
    emitEvent({
      type: "stderr_line",
      line: `Failed to parse command: ${error instanceof Error ? error.message : String(error)}`
    });
    return;
  }
  void handleCommand(command);
});
rl.on("close", () => {
  if (!stopped) {
    emitStatus("stopped", "Native runtime helper stdin closed.");
  }
});
