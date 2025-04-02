const WebSocket = require("ws");
const XMLHttpRequest = require("xhr2");
const JSON5 = require("json5");
const url = require("url");
const pako = require("pako");
const {
  HttpsProxyAgent
} = require("https-proxy-agent");
const {
  Crypto
} = require("@peculiar/webcrypto");
const {
  performance
} = require("perf_hooks");
const {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription
} = require("node-datachannel/polyfill");
const crypto = new Crypto();

var promiseResolve;
var proxyAgent;
var debug = false;

const HBLoaded = new Promise(function(resolve, reject) {
  promiseResolve = resolve;
});

const onHBLoaded = function(cb) {
  return cb;
};

/* Builded & Automated with Haxball.JS Nodeify Script */

/*
 HaxBall @ 2024 - Mario Carbajal - All rights reserved.
 8be54ed5
*/
'use strict';
(function(va) {

  const AvatarMaxLength = 2; // Argh, no effect :(
  global.CurrentTime = 0;
  global.PlayerNoX = new Set();
  global.PlayerAvatarOneTime = new Set();
  global.PlayerIsSpec = new Set();
  // global.PlayerGhost = new Map();
  // global.PlayerGhostInput = new Map();
  global.PlayerInput = new Map();
  global.TimeoutForX = 500;
  function ActionLog(txt) {
    console.log(`#ACTION# ${txt}`);
  }

  function toStringSafe() {
    return HaxballTypeHelper.Zb(this, "")
  }
  const ob = toStringSafe;

  function getBoundFunction(a, b) {
    if (null == b) return null;
    null == b.xd && (b.xd = va.ye++);
    var c;
    null == a.oe ? a.oe = {} : c = a.oe[b.xd];
    null == c && (c = b.bind(a), a.oe[b.xd] = c);
    return c
  }
  const hb = getBoundFunction;
  class HaxballParser {
    static Bh(a) {
      a = a.split(" ");
      let b = a[4];
      if ("typ" != a[6]) throw r.s(null);
      return {
        ni: a[7],
        fh: b
      }
    }
  }
  const pb = HaxballParser;
  class BufferWriter {
    constructor(a, b) {
      null == b && (b = !1);
      this.j = a;
      this.ra = b;
      this.a = 0
    }
    fe() {
      let a = new ArrayBuffer(this.a),
        b = new Uint8Array(this.j.buffer, this.j.byteOffset, this.a);
      (new Uint8Array(a)).set(b);
      return a
    }
    Bb() {
      return new Uint8Array(this.j.buffer, this.j.byteOffset, this.a)
    }
    Sb() {
      return new DataView(this.j.buffer, this.j.byteOffset, this.a)
    }
    mi() {
      return new HaxballDataParser(this.Sb(), this.ra)
    }
    Ia(a) {
      this.j.byteLength < a && this.Rh(2 * this.j.byteLength >= a ? 2 * this.j.byteLength : a)
    }
    Rh(a) {
      if (1 > a) throw r.s("Can't resize buffer to a capacity lower than 1");
      if (this.j.byteLength < a) {
        let b = new Uint8Array(this.j.buffer);
        a = new ArrayBuffer(a);
        (new Uint8Array(a)).set(b);
        this.j = new DataView(a)
      }
    }
    f(a) {
      let b = this.a++;
      this.Ia(this.a);
      this.j.setUint8(b,
        a)
    }
    he(a) {
      let b = this.a;
      this.a += 2;
      this.Ia(this.a);
      this.j.setInt16(b, a, this.ra)
    }
    Oa(a) {
      let b = this.a;
      this.a += 2;
      this.Ia(this.a);
      this.j.setUint16(b, a, this.ra)
    }
    w(a) {
      let b = this.a;
      this.a += 4;
      this.Ia(this.a);
      this.j.setInt32(b, a, this.ra)
    }
    xa(a) {
      let b = this.a;
      this.a += 4;
      this.Ia(this.a);
      this.j.setUint32(b, a, this.ra)
    }
    ge(a) {
      let b = this.a;
      this.a += 4;
      this.Ia(this.a);
      this.j.setFloat32(b, a, this.ra)
    }
    g(a) {
      let b = this.a;
      this.a += 8;
      this.Ia(this.a);
      this.j.setFloat64(b, a, this.ra)
    }
    pb(a) {
      let b = this.a;
      this.a += a.byteLength;
      this.Ia(this.a);
      (new Uint8Array(this.j.buffer, this.j.byteOffset, this.j.byteLength)).set(a, b)
    }
    ti(a) {
      a = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
      this.pb(a)
    }
    Sf(a) {
      this.pb(new Uint8Array(a))
    }
    Tb(a) {
      this.Da(BufferWriter.Ad(a));
      this.ie(a)
    }
    Ca(a) {
      null == a ? this.Da(0) : (this.Da(BufferWriter.Ad(a) + 1), this.ie(a))
    }
    Uf(a) {
      a = (new TextEncoder).encode(a);
      let b = a.length;
      if (255 < b) throw r.s(null);
      this.f(b);
      this.ti(a)
    }
    Tf(a) {
      this.Tb(JSON.stringify(a))
    }
    ie(a) {
      let b = this.a;
      this.Ia(b + BufferWriter.Ad(a));
      let c = a.length,
        d = 0;
      for (; d < c;) b += BufferWriter.Ng(StringHelper2.Wf(a, d++), this.j, b);
      this.a =
        b
    }
    Da(a) { // called from CollectionSynchronizer for every player ping value
      let b = this.a;
      a >>>= 0;
      this.Ia(b + BufferWriter.xg(a));
      this.j.setUint8(b, a | 128);
      128 <= a ? (this.j.setUint8(b + 1, a >> 7 | 128), 16384 <= a ? (this.j.setUint8(b + 2, a >> 14 | 128),
        2097152 <= a ? (this.j.setUint8(b + 3, a >> 21 | 128), 268435456 <= a ? (this.j.setUint8(b + 4, a >>
          28 & 127), a = 5) : (this.j.setUint8(b + 3, this.j.getUint8(b + 3) & 127), a = 4)) : (this.j.setUint8(
          b + 2, this.j.getUint8(b + 2) & 127), a = 3)) : (this.j.setUint8(b + 1, this.j.getUint8(b + 1) & 127),
        a = 2)) : (this.j.setUint8(b, this.j.getUint8(b) & 127), a = 1);
      this.a += a
    }
    static aa(a, b) {
      null == b && (b = !1);
      null == a &&
        (a = 16);
      return new BufferWriter(new DataView(new ArrayBuffer(a)), b)
    }
    static Ng(a, b, c) {
      let d = c;
      if (0 > a) throw r.s("Cannot encode UTF8 character: charCode (" + a + ") is negative");
      if (128 > a) b.setUint8(c, a & 127), ++c;
      else if (2048 > a) b.setUint8(c, a >> 6 & 31 | 192), b.setUint8(c + 1, a & 63 | 128), c += 2;
      else if (65536 > a) b.setUint8(c, a >> 12 & 15 | 224), b.setUint8(c + 1, a >> 6 & 63 | 128), b.setUint8(c + 2,
        a & 63 | 128), c += 3;
      else if (2097152 > a) b.setUint8(c, a >> 18 & 7 | 240), b.setUint8(c + 1, a >> 12 & 63 | 128), b.setUint8(c +
        2, a >> 6 & 63 | 128), b.setUint8(c + 3, a & 63 | 128), c += 4;
      else if (67108864 >
        a) b.setUint8(c, a >> 24 & 3 | 248), b.setUint8(c + 1, a >> 18 & 63 | 128), b.setUint8(c + 2, a >> 12 & 63 |
        128), b.setUint8(c + 3, a >> 6 & 63 | 128), b.setUint8(c + 4, a & 63 | 128), c += 5;
      else if (-2147483648 > a) b.setUint8(c, a >> 30 & 1 | 252), b.setUint8(c + 1, a >> 24 & 63 | 128), b.setUint8(
          c + 2, a >> 18 & 63 | 128), b.setUint8(c + 3, a >> 12 & 63 | 128), b.setUint8(c + 4, a >> 6 & 63 | 128), b
        .setUint8(c + 5, a & 63 | 128), c += 6;
      else throw r.s("Cannot encode UTF8 character: charCode (" + a + ") is too large (>= 0x80000000)");
      return c - d
    }
    static wg(a) {
      if (0 > a) throw r.s("Cannot calculate length of UTF8 character: charCode (" +
        a + ") is negative");
      if (128 > a) return 1;
      if (2048 > a) return 2;
      if (65536 > a) return 3;
      if (2097152 > a) return 4;
      if (67108864 > a) return 5;
      if (-2147483648 > a) return 6;
      throw r.s("Cannot calculate length of UTF8 character: charCode (" + a + ") is too large (>= 0x80000000)");
    }
    static Ad(a) {
      let b = 0,
        c = a.length,
        d = 0;
      for (; d < c;) b += BufferWriter.wg(StringHelper2.Wf(a, d++));
      return b
    }
    static xg(a) {
      a >>>= 0;
      return 128 > a ? 1 : 16384 > a ? 2 : 2097152 > a ? 3 : 268435456 > a ? 4 : 5
    }
  }
  const A = BufferWriter;
  class wa {}
  class SequenceInArrayIterator {
    constructor(a) {
      this.current = 0;
      this.xi = a
    }
    next() {
      return this.xi[this.current++]
    }
  }
  const ib = SequenceInArrayIterator;
  class CallbackHandler {
    static sa(a,
      b) {
      null != a && a(b)
    }
  }
  const Na = CallbackHandler;
  class PhysicsObject {
    constructor() {
      this.rf = 0;
      this.c = this.m = 63;
      this.T = 16777215;
      this.ga = .99;
      this.L = 1;
      this.i = .5;
      this.M = 10;
      this.la = new Point2D(0, 0);
      this.u = new Point2D(0, 0);
      this.a = new Point2D(0, 0)
    }
    G(a) {
      // ActionLog(`PhysicsObject rf=${this.rf} c=${this.c} T=${this.T} ga=${this.ga} L=${this.L} M=${this.M}`);
      var b = this.a;
      a.g(b.x);
      a.g(b.y);
      b = this.u;
      a.g(b.x);
      a.g(b.y);
      b = this.la;
      a.g(b.x);
      a.g(b.y);
      a.g(this.M);
      a.g(this.i);
      a.g(this.L);
      a.g(this.ga);
      a.xa(this.T);
      a.w(this.c);
      a.w(this.m)
    }
    Cg(a) {
      var b = this.a,
        c = a.a,
        d = b.x - c.x;
      b = b.y - c.y;
      var e = a.M + this.M,
        f = d * d + b * b;
      if (0 < f && f <= e * e) {
        f = Math.sqrt(f);
        d /= f;
        b /= f;
        c = this.L / (this.L + a.L);
        e -= f;
        f = e *
          c;
        var g = this.a,
          k = this.a;
        g.x = k.x + d * f;
        g.y = k.y + b * f;
        k = g = a.a;
        e -= f;
        g.x = k.x - d * e;
        g.y = k.y - b * e;
        e = this.u;
        f = a.u;
        e = d * (e.x - f.x) + b * (e.y - f.y);
        0 > e && (e *= this.i * a.i + 1, c *= e, g = f = this.u, f.x = g.x - d * c, f.y = g.y - b * c, a = f = a.u,
          c = e - c, f.x = a.x + d * c, f.y = a.y + b * c)
      }
    }
    Dg(a) {
      if (0 != 0 * a.Ha) {
        var b = a.F.a;
        var c = a.K.a;
        var d = c.x - b.x;
        var e = c.y - b.y,
          f = this.a;
        var g = f.x - c.x;
        c = f.y - c.y;
        f = this.a;
        if (0 >= (f.x - b.x) * d + (f.y - b.y) * e || 0 <= g * d + c * e) return;
        d = a.X;
        b = d.x;
        d = d.y;
        g = b * g + d * c
      } else {
        d = a.ec;
        g = this.a;
        b = g.x - d.x;
        d = g.y - d.y;
        g = a.jd;
        c = a.kd;
        if ((0 < g.x * b + g.y * d && 0 < c.x * b +
            c.y * d) == 0 >= a.Ha) return;
        c = Math.sqrt(b * b + d * d);
        if (0 == c) return;
        g = c - a.Oe;
        b /= c;
        d /= c
      }
      c = a.ub;
      if (0 == c) 0 > g && (g = -g, b = -b, d = -d);
      else if (0 > c && (c = -c, g = -g, b = -b, d = -d), g < -c) return;
      g >= this.M || (g = this.M - g, e = c = this.a, c.x = e.x + b * g, c.y = e.y + d * g, g = this.u, g = b * g
        .x + d * g.y, 0 > g && (g *= this.i * a.i + 1, c = a = this.u, a.x = c.x - b * g, a.y = c.y - d * g))
    }
  }
  const xa = PhysicsObject;
  class DataCompressor {
    constructor(a, b) {
      this.cg = 0;
      this.version = 1;
      this.ud = 0;
      this.Gb = BufferWriter.aa(1E3);
      this.xc = BufferWriter.aa(16384);
      this.version = b;
      let c = this.ud = a.da;
      this.qe = a;
      a.Fa.G(this.xc);
      let d = this;
      a.yb = function(f) {
        let g = a.da;
        d.xc.Da(g - c);
        c = g;
        d.xc.Oa(f.B);
        ActionHandler.ue(f, d.xc)
      };
      this.Gb.Oa(0);
      let e = this.ud;
      a.Fa.Gf(function(f) {
        let g = a.da;
        d.Gb.Da(g - e);
        d.Gb.f(f);
        d.cg++;
        e = g
      })
    }
    stop() {
      this.qe.yb = null;
      this.qe.Fa.Gf(null);
      this.Gb.j.setUint16(0, this.cg, this.Gb.ra);
      this.Gb.pb(this.xc.Bb());
      let a = pako.deflateRaw(this.Gb.Bb()),
        b = BufferWriter.aa(a.byteLength + 32);
      b.ie("HBR2");
      b.xa(this.version);
      b.xa(this.qe.da - this.ud);
      b.pb(a);
      return b.Bb()
    }
  }
  const Wa = DataCompressor;
  class DataContainer {
    constructor() {
      this.Kc = 0;
      this.m = 32;
      this.c = 63;
      this.i = 1;
      this.a = new Point2D(0, 0)
    }
    G(a) {
      let b = this.a;
      a.g(b.x);
      a.g(b.y);
      a.g(this.i);
      a.w(this.c);
      a.w(this.m)
    }
    pa(a) {
      let b = this.a;
      b.x = a.o();
      b.y = a.o();
      this.i = a.o();
      this.c = a.H();
      this.m = a.H()
    }
  }
  const C = DataContainer;
  class HaxballHttpRequest {
    static zf(a, b, c, d) {
      return new Promise(function(e, f) {
        let g = new XMLHttpRequest;
        g.open(b, a);
        g.responseType = "json";
        g.onload = function() {
          200 <= g.status && 300 > g.status ? null != g.response ? e(g.response) : f(null) : f("status: " + g
            .status)
        };
        g.onerror = function(k) {
          f(k)
        };
        null != d && g.setRequestHeader("Content-type", d);
        g.send(c)
      })
    }
    static Pg(a) {
      return HaxballHttpRequest.zf(a, "GET", null)
    }
    static Rg(a) {
      return HaxballHttpRequest.Pg(a).then(function(b) {
        let c =
          b.error;
        if (null != c) throw r.s(c);
        return b.data
      })
    }
    static Hh(a, b, c) {
      return HaxballHttpRequest.zf(a, "POST", b, c)
    }
    static Ih(a, b, c) {
      return HaxballHttpRequest.Hh(a, b, c).then(function(d) {
        let e = d.error;
        if (null != e) throw r.s(e);
        return d.data
      })
    }
  }
  const T = HaxballHttpRequest;
  class VectorCalculation {
    constructor() {
      this.jd = this.kd = this.X = null;
      this.Oe = 0;
      this.K = this.F = this.ec = null;
      this.ub = 0;
      this.i = 1;
      this.c = 63;
      this.m = 32;
      this.Ha = 1 / 0;
      this.va = !0;
      this.T = 0
    }
    G(a) {
      let b = 0,
        c = a.a;
      a.f(0);
      a.f(this.F.Kc);
      a.f(this.K.Kc);
      0 != this.ub && (b = 1, a.g(this.ub));
      this.Ha != 1 / 0 && (b |= 2, a.g(this.Ha));
      0 != this.T && (b |= 4, a.w(this.T));
      this.va && (b |= 8);
      a.j.setUint8(c, b);
      a.g(this.i);
      a.w(this.c);
      a.w(this.m)
    }
    pa(a, b) {
      let c = a.C();
      this.F = b[a.C()];
      this.K = b[a.C()];
      this.ub = 0 != (c & 1) ? a.o() : 0;
      this.Ha = 0 != (c & 2) ? a.o() : 1 / 0;
      this.T = 0 != (c & 4) ? a.H() : 0;
      this.va = 0 != (c & 8);
      this.i = a.o();
      this.c = a.H();
      this.m = a.H()
    }
    bb(a) {
      a *= .017453292519943295;
      if (0 > a) {
        a = -a;
        let b = this.F;
        this.F = this.K;
        this.K = b;
        this.ub = -this.ub
      }
      a > VectorCalculation.jg && a < VectorCalculation.ig && (this.Ha = 1 / Math.tan(a / 2))
    }
    Nb() {
      if (0 == 0 * this.Ha) {
        var a = this.K.a,
          b = this.F.a,
          c = .5 * (a.x - b.x);
        a = .5 * (a.y - b.y);
        b = this.F.a;
        let d = this.Ha;
        this.ec =
          new Point2D(b.x + c + -a * d, b.y + a + c * d);
        a = this.F.a;
        b = this.ec;
        c = a.x - b.x;
        a = a.y - b.y;
        this.Oe = Math.sqrt(c * c + a * a);
        c = this.F.a;
        a = this.ec;
        this.jd = new Point2D(-(c.y - a.y), c.x - a.x);
        c = this.ec;
        a = this.K.a;
        this.kd = new Point2D(-(c.y - a.y), c.x - a.x);
        0 >= this.Ha && (a = c = this.jd, c.x = -a.x, c.y = -a.y, a = c = this.kd, c.x = -a.x, c.y = -a.y)
      } else a = this.F.a, b = this.K.a, c = a.x - b.x, a = -(a.y - b.y), b = Math.sqrt(a * a + c * c), this.X =
        new Point2D(a / b, c / b)
    }
  }
  const E = VectorCalculation;
  class PlayerPosition {
    constructor() {
      this.rc = HaxballActionContext.na;
      this.K = new Point2D(0, 0);
      this.F = new Point2D(0, 0)
    }
    G(a) {
      var b = this.F;
      a.g(b.x);
      a.g(b.y);
      b = this.K;
      a.g(b.x);
      a.g(b.y);
      a.f(this.rc.S)
    }
    pa(a) {
      var b = this.F;
      b.x = a.o();
      b.y = a.o();
      b = this.K;
      b.x = a.o();
      b.y = a.o();
      a = a.Vd();
      this.rc = 1 == a ? HaxballActionContext.fa : 2 == a ? HaxballActionContext.ta : HaxballActionContext.na
    }
  }
  const ya = PlayerPosition;
  class W {}
  class HaxballTypeHelper {
    static Yf(a) {
      if (null == a) return null;
      if (a instanceof Array) return Array;
      {
        let b = a.h;
        if (null != b) return b;
        a = HaxballTypeHelper.Ee(a);
        return null != a ? HaxballTypeHelper.og(a) : null
      }
    }
    static Zb(a, b) {
      if (null == a) return "null";
      if (5 <= b.length) return "<...>";
      var c = typeof a;
      "function" == c && (a.b || a.Ce) && (c = "object");
      switch (c) {
        case "function":
          return "<function>";
        case "object":
          if (a.Yb) {
            var d = Xa[a.Yb].Be[a.Kd];
            c =
              d.Xe;
            if (d.Ge) {
              b += "\t";
              var e = [],
                f = 0;
              for (d = d.Ge; f < d.length;) {
                let g = d[f];
                f += 1;
                e.push(HaxballTypeHelper.Zb(a[g], b))
              }
              a = e;
              return c + "(" + a.join(",") + ")"
            }
            return c
          }
          if (a instanceof Array) {
            c = "[";
            b += "\t";
            e = 0;
            for (f = a.length; e < f;) d = e++, c += (0 < d ? "," : "") + HaxballTypeHelper.Zb(a[d], b);
            return c += "]"
          }
          try {
            e = a.toString
          } catch (g) {
            return "???"
          }
          if (null != e && e != Object.toString && "function" == typeof e && (c = a.toString(), "[object Object]" !=
              c)) return c;
          c = "{\n";
          b += "\t";
          e = null != a.hasOwnProperty;
          f = null;
          for (f in a) e && !a.hasOwnProperty(f) || "prototype" == f || "__class__" == f ||
            "__super__" == f || "__interfaces__" == f || "__properties__" == f || (2 != c.length && (c += ", \n"),
              c += b + f + " : " + HaxballTypeHelper.Zb(a[f], b));
          b = b.substring(1);
          return c += "\n" + b + "}";
        case "string":
          return a;
        default:
          return String(a)
      }
    }
    static De(a, b) {
      for (;;) {
        if (null == a) return !1;
        if (a == b) return !0;
        let c = a.gb;
        if (null != c && (null == a.J || a.J.gb != c)) {
          let d = 0,
            e = c.length;
          for (; d < e;) {
            let f = c[d++];
            if (f == b || HaxballTypeHelper.De(f, b)) return !0
          }
        }
        a = a.J
      }
    }
    static mg(a, b) {
      if (null == b) return !1;
      switch (b) {
        case Array:
          return a instanceof Array;
        case Ya:
          return "boolean" == typeof a;
        case vb:
          return null !=
            a;
        case z:
          return "number" == typeof a;
        case za:
          return "number" == typeof a ? (a | 0) === a : !1;
        case String:
          return "string" == typeof a;
        default:
          if (null != a)
            if ("function" == typeof b) {
              if (HaxballTypeHelper.lg(a, b)) return !0
            } else {
              if ("object" == typeof b && HaxballTypeHelper.ng(b) && a instanceof b) return !0
            }
          else return !1;
          return b == wb && null != a.b || b == xb && null != a.Ce ? !0 : null != a.Yb ? Xa[a.Yb] == b : !1
      }
    }
    static lg(a, b) {
      return a instanceof b ? !0 : b.yd ? HaxballTypeHelper.De(HaxballTypeHelper.Yf(a), b) : !1
    }
    static l(a, b) {
      if (null == a || HaxballTypeHelper.mg(a, b)) return a;
      throw r.s("Cannot cast " + HaxballUtils.xe(a) + " to " + HaxballUtils.xe(b));
    }
    static Ee(a) {
      a =
        HaxballTypeHelper.pg.call(a).slice(8, -1);
      return "Object" == a || "Function" == a || "Math" == a || "JSON" == a ? null : a
    }
    static ng(a) {
      return null != HaxballTypeHelper.Ee(a)
    }
    static og(a) {
      return va[a]
    }
  }

  class InputData {
    constructor() {
      this.no_x = false;
      this.x = false;
      this.since = 0;
      this.x_once = false;
      this.x_counter = 0;
      this.keys = 0;
    }
  }

  const q = HaxballTypeHelper;
  class HaxballPlayerData {
    constructor() {
      this.ja = HaxballActionContext.na;
      this.N = null;
      this.Wb = this.uc = 0;
      this.Cb = !1;
      this.Jb = this.ma = 0;
      this.oa = "Player";
      this.Ai = this.$c = 0;
      this.country = null;
      this.ne = !1;
      this.Db = this.Vf = null;
      this.Eb = 0;
      this.Ub = !1;
      this.input = new InputData();
      // this.NoX = false;
    }
    P(a) {
      // sent on player join

      a.f(this.Ub ? 1 : 0);
      a.w(this.Eb);
      a.Ca(this.Db);
      a.Ca(this.Vf);
      a.f(this.ne ? 1 : 0);
      a.Ca(this.country);
      a.w(this.Ai);
      a.Ca(this.oa);
      a.w(this.Jb);
      a.Da(this.ma);
      a.f(this.Cb ? 1 : 0);
      a.he(this.Wb);
      a.f(this.uc);
      a.f(this.ja.S);
      a.he(null == this.N ? -1 : this.N.rf)
    }
  }
  const Aa = HaxballPlayerData;
  class HaxballStringUtils {
    static truncate(a, b) {
      return a.length <= b ? a : StringHelper2.substr(a, 0, b)
    }
    static qb = HaxballStringUtils.truncate;
    static byteArrayToString(a) {
      let b = "",
        c = 0,
        d = a.byteLength;
      for (; c < d;) b += HexConverter.Bi(a[c++]);
      return b
    }
    static yi = HaxballStringUtils.byteArrayToString;
  }
  const R = HaxballStringUtils;
  class HaxballPlayerManager {
    constructor() {
      this.ea = null;
      this.Xc = 2;
      this.fc = 0;
      this.Pd = 1;
      this.ab = this.Na = 3;
      this.md = !1;
      this.D = null;
      this.ba = [];
      this.Xd = "";
      this.ea = HaxballMapsManager.Gd()[0];
      this.sc = [null, new X, new X];
      this.sc[1].Qa.push(HaxballActionContext.fa.T);
      this.sc[2].Qa.push(HaxballActionContext.ta.T)
    }
    ei(a) {
      if (null == this.D) {
        this.D = new HaxballPhysicsSimulator;
        for (var b =
            0, c = this.ba; b < c.length;) {
          let d = c[b];
          ++b;
          d.N = null;
          d.Eb = 0
        }
        this.D.eh(this);
        null != this.Jf && this.Jf(a)
      }
    }
    Hc(a, b, c) {
      if (b.ja != c) {
        b.ja = c;
        StringHelper2.remove(this.ba, b);
        this.ba.push(b);
        if (null != this.D) {
          null != b.N && (StringHelper2.remove(this.D.ia.A, b.N), b.N = null);
          this.D.$e(b);
          let d = 0,
            e = !1;
          for (; !e;) {
            ++d;
            e = !0;
            let f = 0,
              g = this.ba;
            for (; f < g.length;) {
              let k = g[f];
              ++f;
              if (k != b && k.ja == b.ja && k.Eb == d) {
                e = !1;
                break
              }
            }
          }
          b.Eb = d
        }
        CallbackHandler2.sa(this.Gh, a, b, c)
      }
    }
    R(a) {
      let b = 0,
        c = this.ba;
      for (; b < c.length;) {
        let d = c[b];
        ++b;
        if (d.ma == a) return d
      }
      return null
    }
    Ba(a) {
      null != this.D &&
        this.D.Ba(a)
    }
    G(a) {
      a.Ca(this.Xd);
      a.f(this.md ? 1 : 0);
      a.w(this.ab);
      a.w(this.Na);
      a.he(this.Pd);
      a.f(this.fc);
      a.f(this.Xc);
      this.ea.G(a);
      a.f(null != this.D ? 1 : 0);
      null != this.D && this.D.G(a);
      a.f(this.ba.length);
      let b = 0,
        c = this.ba;
      for (; b < c.length;) c[b++].P(a);
      this.sc[1].G(a);
      this.sc[2].G(a)
    }
    Ue() {
      let a = 0;
      var b = BufferWriter.aa();
      this.G(b);
      for (b = b.mi(); 4 <= b.j.byteLength - b.a;) a ^= b.H();
      return a
    }
    Qg() {
      let a = BufferWriter.aa(4);
      a.w(this.Ue());
      return a.fe()
    }
    Eg(a) {
      a = (new HaxballDataParser(new DataView(a))).H();
      CallbackHandler.sa(this.Ii, this.Ue() != a)
    }
    Gf(a) {
      this.yf = a
    }
    za(a) {
      if (0 ==
        a) return !0;
      a = this.R(a);
      return null != a && a.Ub ? !0 : !1
    }
    ai(a, b, c, d) {
      this.Xc = 0 > b ? 0 : 255 < b ? 255 : b;
      this.fc = 0 > c ? 0 : 255 < c ? 255 : c;
      0 > d ? d = 0 : 100 < d && (d = 100);
      this.Pd = this.fc * d;
      HaxballCallbackExecutor.executeCallback(this.hh, a, this.Xc, this.fc, d)
    }
  }
  const Pa = HaxballPlayerManager;
  class HaxballCallbackExecutor {
    static executeCallback(a, b, c, d, e) {
      null != a && a(b, c, d, e)
    }
    static sa = HaxballCallbackExecutor.executeCallback;
  }
  const Za = HaxballCallbackExecutor;
  class rb {
    static Ci() {
      ActionHandler.$(StyledMessageHandler);
      ActionHandler.$(PlayerStateNotifier);
      ActionHandler.$(DataActionHandler);
      ActionHandler.$(PlayerInputHandler);
      ActionHandler.$(ChatMessageHandler);
      ActionHandler.$(PlayerRegistrationHandler);
      ActionHandler.$(PlayerRemovalHandler);
      ActionHandler.$(SomeSmallActionHandler);
      ActionHandler.$(CleanupActionHandler);
      ActionHandler.$(MatchFlagToggler);
      ActionHandler.$(ValueSetterActionHandler);
      ActionHandler.$(MapDataCompressionHandler);
      ActionHandler.$(GameStartStopSwitcher);
      ActionHandler.$(ValueChangeHandler);
      ActionHandler.$(GiveAdminActionHandler);
      ActionHandler.$(ContextualActionHandler);
      ActionHandler.$(StateChangeActionHandler);
      ActionHandler.$(CollectionSynchronizer);
      ActionHandler.$(AvatarUpdaterActionHandler);
      ActionHandler.$(ActionContextHandler);
      ActionHandler.$(PlayerReorderHandler);
      ActionHandler.$(RateAdjuster);
      ActionHandler.$(AvatarHandler2);
      ActionHandler.$(PhysicsUpdateHandler)
    }
  }

  class SignatureVerifier {
    static verifySignature(a, b) {
      try {
        let c = new HaxballDataParser(new DataView(a.buffer,
          a.byteOffset, a.byteLength), !1);
        c.C();
        let d = c.La(c.kc()),
          e = c.La(),
          f = new HaxballDataParser(new DataView(d.buffer, d.byteOffset, d.byteLength), !1),
          g = f.mb(),
          k = f.mb(),
          l = f.La();
        if (l.byteLength != b.byteLength) return Promise.reject(null);
        a = 0;
        let p = l.byteLength;
        for (; a < p;) {
          let t = a++;
          if (l[t] != b[t]) return Promise.reject(null)
        }
        return SignatureVerifier.ui(g, k).then(function(t) {
          return crypto.subtle.verify(SignatureVerifier.ci, t, e, d)
        }).then(function(t) {
          if (!t) throw r.s(null);
          return g
        })
      } catch (c) {
        return Promise.reject(r.Vb(c).Hb())
      }
    }
    static ri = SignatureVerifier.verifySignature;
    static importPublicKey(a, b) {
      try {
        return crypto.subtle.importKey("jwk", {
          crv: "P-256",
          ext: !0,
          key_ops: ["verify"],
          kty: "EC",
          x: a,
          y: b
        }, SignatureVerifier.sg, !0, ["verify"])
      } catch (c) {
        return Promise.reject(r.Vb(c).Hb())
      }
    }
    static ui = SignatureVerifier.importPublicKey;
  }
  const ra = SignatureVerifier;

  class HaxballShortPlayerData {
    constructor() {}
    yg() {
      this.oa = HaxballStringUtils.truncate(this.oa, 40);
      this.ib = HaxballStringUtils.truncate(this.ib, 3)
    }
    G(a) {
      this.yg();
      a.ra = !0;
      a.Oa(this.pi);
      a.Uf(this.oa);
      a.Uf(this.ib);
      a.ge(this.Rc);
      a.ge(this.Tc);
      a.f(this.lb ? 1 : 0);
      a.f(this.xh);
      a.f(this.ba);
      a.ra = !1
    }
  }
  const $a = HaxballShortPlayerData;
  class HaxballPhysicsSimulator {
    constructor() {
      this.zb = this.vb = this.Lb = this.Xa = 0;
      this.Nd = HaxballActionContext.fa;
      this.Ab = this.$a = 0;
      this.ia = new SomeInteractionManager;
      this.Na = 0;
      this.ab = 5;
      this.ea = null
    }
    eh(a) {
      this.ha = a;
      this.ab =
        a.ab;
      this.Na = a.Na;
      this.ea = a.ea;
      this.ia.v = this.ea.v;
      this.ia.Y = this.ea.Y;
      this.ia.I = this.ea.I;
      this.ia.Ta = this.ea.Ta;
      a = 0;
      let b = this.ea.A;
      for (; a < b.length;) this.ia.A.push(b[a++].th());
      this.af()
    }
    $e(a) {
      if (a.ja == HaxballActionContext.na) a.N = null;
      else {
        a.Jb = 0;
        var b = a.N;
        null == b && (b = new PhysicsObject, a.N = b, this.ia.A.push(b));
        var c = this.ea.Mb;
        b.T = 0;
        b.M = c.M;
        b.L = c.L;
        b.ga = c.ga;
        b.i = c.i;
        b.c = 39;
        b.m = a.ja.m | c.m;
        var d = a.ja == HaxballActionContext.fa ? this.ea.Pb : this.ea.Ib;
        0 == d.length ? (b.a.x = a.ja.Qe * this.ea.cc, b.a.y = 0) : (a = b.a, d = d[d.length - 1], a.x = d.x, a.y =
          d.y);
        d = b.u;
        d.x = 0;
        d.y =
          0;
        b = b.la;
        c = c.la;
        b.x = c.x;
        b.y = c.y
      }
    }
    Ba(a) {
      // ActionLog("Ba(a)");
      global.CurrentTime = Date.now();
      if (0 < this.Xa) 120 > this.Xa && this.Xa--;
      else {
        // ActionLog("Ba(a) else");
        var b = this.ha.Og;
        null != b && b();
        b = this.ha.ba;
        for (var c = 0; c < b.length;) {
          var d = b[c];
          ++c;
          if (null != d.N) {
            // ActionLog(`Ba(a) else if ${c}/${b.length} Jb=${d.Jb} Cb=${d.Cb}`);
            0 == (d.Jb & 16) && (d.Cb = !1);
            var e = this.ea.Mb;
            0 < d.uc && d.uc--;
            d.Wb < this.ha.Pd && d.Wb++;
            // ActionLog(`Ba(a) else if uc=${d.uc} Wb=${d.Wb} klen=${k.length}`);
            if (d.Cb && 0 >= d.uc && 0 <= d.Wb) {
              for (var f = !1, g = 0, k = this.ia.A; g < k.length;) {
                var l = k[g];
                ++g;
                if (0 != (l.m & 64) && l != d.N) {
                  var p = l.a,
                    t = d.N.a,
                    x = p.x - t.x;
                  p = p.y - t.y;
                  t = Math.sqrt(x * x + p * p);
                  if (4 > t - l.M - d.N.M) {
                    f = x / t;
                    x = p / t;
                    p = e.Mc;
                    var B = t = l.u;
                    l = l.L;
                    t.x = B.x + f * p * l;
                    t.y = B.y +
                      x * p * l;
                    B = d.N;
                    l = -e.Nc;
                    t = p = B.u;
                    B = B.L;
                    p.x = t.x + f * l * B;
                    p.y = t.y + x * l * B;
                    f = !0
                  }
                }
              }
              // ActionLog(`D uc: ${d.uc} -> ${this.ha.Xc} , Wb: ${d.Wb} -> ${this.ha.fc}`);
              f && (null != this.ha.vf && this.ha.vf(d), d.Cb = !1, d.uc = this.ha.Xc, d.Wb -= this.ha.fc)
            }
            f = d.Jb;
            k = g = 0;
            0 != (f & 1) && --k;
            0 != (f & 2) && ++k;
            0 != (f & 4) && --g;
            0 != (f & 8) && ++g;
            0 != g && 0 != k && (f = Math.sqrt(g * g + k * k), g /= f, k /= f);
            f = d.N.u;
            l = d.Cb ? e.Oc : e.zc;
            f.x += g * l;
            f.y += k * l;
            d.N.ga = d.Cb ? e.Pc : e.ga
          }
        }
        c = 0;
        d = this.ia.A;
        e = 0;
        for (g = d.length; e < g;) f = e++, k = d[f], 0 != (k.m & 128) && (HaxballPhysicsSimulator.Re[c] = f, f = HaxballPhysicsSimulator.jf[c], k = k.a, f.x =
          k.x, f.y = k.y, ++c);
        this.ia.Ba(a);
        if (0 == this.$a) {
          for (a = 0; a < b.length;) c = b[a], ++a,
            null != c.N && (c.N.c = 39 | this.Nd.ih);
          b = this.ia.A[0].u;
          0 < b.x * b.x + b.y * b.y && (this.$a = 1)
        } else if (1 == this.$a) {
          this.Lb += .016666666666666666;
          for (a = 0; a < b.length;) d = b[a], ++a, null != d.N && (d.N.c = 39);
          d = HaxballActionContext.na;
          b = this.ia.A;
          for (a = 0; a < c && (d = a++, d = this.ea.Ag(b[HaxballPhysicsSimulator.Re[d]].a, HaxballPhysicsSimulator.jf[d]), d == HaxballActionContext.na););
          d != HaxballActionContext.na ? (this.$a = 2, this.Ab = 150, this.Nd = d, d == HaxballActionContext.fa ? this.vb++ : this.zb++, null != this.ha
              .Lf && this.ha.Lf(d.Zc), null != this.ha.yf && this.ha.yf(d.S)) : 0 < this.Na && this.Lb >= 60 * this
            .Na && this.zb != this.vb && (null != this.ha.ji && this.ha.ji(), this.If())
        } else if (2 ==
          this.$a) this.Ab--, 0 >= this.Ab && (0 < this.ab && (this.zb >= this.ab || this.vb >= this.ab) || 0 < this
          .Na && this.Lb >= 60 * this.Na && this.zb != this.vb ? this.If() : (this.af(), null != this.ha.wf &&
            this.ha.wf()));
        else if (3 == this.$a && (this.Ab--, 0 >= this.Ab && (b = this.ha, null != b.D))) {
          b.D = null;
          a = 0;
          for (c = b.ba; a < c.length;) d = c[a], ++a, d.N = null, d.Eb = 0;
          null != b.ld && b.ld(null)
        }
      }
    }
    If() {
      this.Ab = 300;
      this.$a = 3;
      null != this.ha.Mf && this.ha.Mf(this.zb > this.vb ? HaxballActionContext.fa : HaxballActionContext.ta)
    }
    af() {
      let a = this.ha.ba;
      this.$a = 0;
      for (var b = this.ea.A, c = this.ia.A, d = 0, e = this.ea.dd ?
          b.length : 1; d < e;) {
        var f = d++;
        b[f].Ze(c[f])
      }
      b = [0, 0, 0];
      for (c = 0; c < a.length;)
        if (d = a[c], ++c, this.$e(d), e = d.ja, e != HaxballActionContext.na) {
          f = d.N.a;
          var g = this.ea,
            k = b[e.S],
            l = e == HaxballActionContext.fa ? g.Pb : g.Ib;
          0 == l.length ? (l = k + 1 >> 1, 0 == (k & 1) && (l = -l), g = g.Ma * e.Qe, k = 55 * l) : (k >= l
            .length && (k = l.length - 1), k = l[k], g = k.x, k = k.y);
          f.x = g;
          f.y = k;
          b[e.S]++;
          d.Eb = b[e.S]
        }
    }
    G(a) {
      this.ia.G(a);
      a.w(this.Ab);
      a.w(this.$a);
      a.w(this.zb);
      a.w(this.vb);
      a.g(this.Lb);
      a.w(this.Xa);
      a.f(this.Nd.S)
    }
  }
  const Q = HaxballPhysicsSimulator;

  class ActionHandler {
    constructor() {
      ActionHandler.Ja || this.Aa()
    }
    Aa() {
      this.eg = this.fg = this.fb = 0
    }
    dg() {
      return !0
    }
    apply() {
      throw r.s("missing implementation");
    }
    W() {
      throw r.s("missing implementation");
    }
    P() {
      throw r.s("missing implementation");
    }
    static Z(a) {
      null == a.delay && (a.delay = !0);
      null == a.ca && (a.ca = !0);
      return a
    }
    static $(a) {
      a.kg = ActionHandler.je;
      if (null == a.U) throw r.s("Class doesn't have a config");
      a.prototype.le = a.U;
      ActionHandler.Zf.set(ActionHandler.je, a);
      ActionHandler.je++
    }
    static ue(a, b) {
      let c = HaxballTypeHelper.Yf(a).kg;
      if (null == c) throw r.s("Tried to pack unregistered action");
      b.f(c);
      a.P(b)
    }
    static Hi(a) {
      var b = a.C();
      b = Object.create(ActionHandler.Zf.get(b).prototype);
      b.fb = 0;
      b.eb = 0;
      b.W(a);
      return b
    }
  }
  const m = ActionHandler;
  class ObjectPropertyFilter {
    static zi(a) {
      let b = [];
      if (null != a) {
        let d = Object.prototype.hasOwnProperty;
        for (var c in a) "__id__" != c && "hx__closures__" != c && d.call(a, c) && b.push(c)
      }
      return b
    }
  }
  const sb = ObjectPropertyFilter;
  class kb {}
  class RecaptchaLoader {
    static jh() {
      if (null != RecaptchaLoader.Ud) return RecaptchaLoader.Ud;
      RecaptchaLoader.Ud = new Promise(function(a, b) {
        var c = grecaptcha;
        null != c ? a(c) : (c = createElement("script"), c.src =
          "https://www.google.com/recaptcha/api.js?onload=___recaptchaload&render=explicit", head.appendChild(
            c), ___recaptchaload = function() {
            a(grecaptcha)
          }, c.onerror = function() {
            b(null)
          })
      });
      return RecaptchaLoader.Ud
    }
  }
  const Ga = RecaptchaLoader;
  class RateLimiter {
    constructor(a, b) {
      this.Le = a;
      this.Pf = b;
      this.tb = a;
      this.Qc = performance.now()
    }
    Qf() {
      var a;
      null == a && (a = 1);
      this.Ba();
      return a <= this.tb ? (this.tb -= a, !0) : !1
    }
    Ba() {
      let a = performance.now(),
        b = Math.floor((a - this.Qc) / this.Pf);
      this.Qc += b * this.Pf;
      this.tb += b;
      this.tb >= this.Le && (this.tb = this.Le, this.Qc = a)
    }
  }
  const Ra = RateLimiter;
  class HaxballRtcSessionManager {
    constructor(a, b, c, d) {
      this.Ac = new Set;
      this.$b = new Set;
      this.ed = this.lc = this.Ef = !1;
      this.Za = null;
      this.mc = this.S = "";
      this.Th = 5E4;
      this.Sh = 1E4;
      this.xb = new Map;
      this.di = a;
      this.Md =
        b;
      this.zg = c;
      this.mc = d;
      null == this.mc && (this.mc = "");
      this.ce()
    }
    be(a) {
      if (null != this.Za || null != a) {
        if (null != this.Za && null != a && this.Za.byteLength == a.byteLength) {
          let c = new Uint8Array(this.Za),
            d = new Uint8Array(a),
            e = !1,
            f = 0,
            g = this.Za.byteLength;
          for (; f < g;) {
            let k = f++;
            if (c[k] != d[k]) {
              e = !0;
              break
            }
          }
          if (!e) return
        }
        this.Za = a.slice(0);
        this.ed = !0;
        var b = this;
        null != this.ua && 1 == this.ua.readyState && null == this.fd && (this.Zd(), this.fd = setTimeout(
      function() {
          b.fd = null;
          1 == b.ua.readyState && b.ed && b.Zd()
        }, 1E4))
      }
    }
    ae(a) {
      function b() {
        null !=
          c.ua && 1 == c.ua.readyState && c.lc != c.Ef && c.Cf();
        c.Af = null
      }
      this.lc = a;
      let c = this;
      null == this.Af && (b(), this.Af = setTimeout(b, 1E3))
    }
    ce(a) {
      function b(e) {
        e = e.sitekey;
        if (null == e) throw r.s(null);
        null != d.ic && d.ic(e, function(f) {
          d.ce(f)
        })
      }

      function c(e) {
        let f = e.url;
        if (null == f) throw r.s(null);
        e = e.token;
        if (null == e) throw r.s(null);
        d.ua = new WebSocket(f + "?token=" + e, {
          headers: {
            origin: "https://html5.haxball.com"
          },
          agent: proxyAgent
        });
        d.ua.binaryType = "arraybuffer";
        d.ua.onopen = function() {
          d.bh()
        };
        d.ua.onclose = function(g) {
          d.Hd(4001 != g.code)
        };
        d.ua.onerror = function(err) {
          d.Hd(!0);
          debug && console.error(err)
        };;
        d.ua.onmessage =
          getBoundFunction(d, d.ah)
      }
      null == a && (a = "");
      let d = this;
      HaxballHttpRequest.Ih(this.di, "token=" + this.mc + "&rcr=" + a, HaxballHttpRequest.hg).then(function(e) {
        switch (e.action) {
          case "connect":
            c(e);
            break;
          case "recaptcha":
            console.log(new Error("Invalid Token Provided!"));
        }
      }).catch(function() {
        d.Hd(!0)
      })
    }
    bh() {
      null != this.Za && this.Zd();
      0 != this.lc && this.Cf();
      let a = this;
      this.Dh = setInterval(function() {
        a.Yh()
      }, 4E4)
    }
    ah(a) {
      a = new HaxballDataParser(new DataView(a.data), !1);
      switch (a.C()) {
        case 1:
          this.Zg(a);
          break;
        case 4:
          this.Ug(a);
          break;
        case 5:
          this.Wg(a);
          break;
        case 6:
          this.Yg(a)
      }
    }
    Zg(a) {
      let b = a.Ob(),
        c = HaxballStringUtils.byteArrayToString(a.La(a.C())),
        d, e, f;
      try {
        a =
          new HaxballDataParser(new DataView(pako.inflateRaw(a.La()).buffer), !1);
        d = 0 != a.C();
        e = a.mb();
        let g = a.xf(),
          k = [],
          l = 0;
        for (; l < g.length;) k.push(new RTCIceCandidate(g[l++]));
        f = k
      } catch (g) {
        this.oc(b, 0);
        return
      }
      this.$g(b, c, e, f, a, d)
    }
    $g(a, b, c, d, e, f) {
      if (16 <= this.xb.size) this.oc(a, 4104);
      else if (this.Ac.has(b)) this.oc(a, 4102);
      else {
        for (var g = [], k = 0; k < d.length;) {
          let x = HaxballRtcSessionManager.Ve(d[k++]);
          if (null != x) {
            if (this.$b.has(x)) {
              this.oc(a, 4102);
              return
            }
            g.push(x)
          }
        }
        if (null != this.Ne && (k = new HaxballDataParser(e.j), k.a = e.a, e = this.Ne(b, k), 1 == e.Kd)) {
          this.oc(a, e.reason);
          return
        }
        var l =
          new RtcConnectionHandler(a, this.Md, this.zg);
        f && (l.Pe = 2500);
        l.Rb = g;
        l.hb = b;
        this.xb.set(a, l);
        var p = this,
          t = function() {
            p.pc(0, l, null);
            p.xb.delete(l.S)
          };
        l.Sd = t;
        l.Rd = function() {
          p.xb.delete(l.S);
          p.pc(0, l, null);
          null != p.lf && p.lf(new WebSocketConnection(l))
        };
        l.gi();
        (async function() {
          try {
            let x = await l.Gg(new RTCSessionDescription({
              sdp: c,
              type: "offer"
            }), d);
            p.Zh(l, x, l.Ld);
            l.Ye.then(function() {
              p.pc(0, l, null)
            });
            l.Td = function(B) {
              p.Xh(l, B)
            }
          } catch (x) {
            t()
          }
        })()
      }
    }
    Ug(a) {
      let b = a.Ob(),
        c;
      try {
        a = new HaxballDataParser(new DataView(pako.inflateRaw(a.La()).buffer), !1), c = new RTCIceCandidate(a.xf())
      } catch (d) {
        return
      }
      this.Vg(b,
        c)
    }
    Vg(a, b) {
      a = this.xb.get(a);
      if (null != a) {
        let c = HaxballRtcSessionManager.Ve(b);
        if (null != c && (a.Rb.push(c), this.$b.has(c))) return;
        a.Ie(b)
      }
    }
    Wg(a) {
      this.S = a.ad(a.C());
      null != this.Yc && this.Yc(this.S)
    }
    Yg(a) {
      this.mc = a.ad(a.j.byteLength - a.a)
    }
    pc(a, b, c) {
      if (!b.pf) {
        0 == a && (b.pf = !0);
        var d = b.S;
        b = BufferWriter.aa(32, !1);
        b.f(a);
        b.xa(d);
        null != c && (a = pako.deflateRaw(c.Bb()), b.pb(a));
        this.ua.send(b.Sb())
      }
    }
    oc(a, b) {
      let c = BufferWriter.aa(16, !1);
      c.f(0);
      c.xa(a);
      c.Oa(b);
      this.ua.send(c.Sb())
    }
    Yh() {
      let a = BufferWriter.aa(1, !1);
      a.f(8);
      this.ua.send(a.Sb())
    }
    Zd() {
      this.ed = !1;
      let a = BufferWriter.aa(256,
        !1);
      a.f(7);
      null != this.Za && a.Sf(this.Za);
      this.ua.send(a.Sb())
    }
    Cf() {
      let a = BufferWriter.aa(2, !1);
      a.f(9);
      a.f(this.lc ? 1 : 0);
      this.ua.send(a.Sb());
      this.Ef = this.lc
    }
    Zh(a, b, c) {
      let d = BufferWriter.aa(32, !1);
      d.Tb(b.sdp);
      d.Tf(c);
      this.pc(1, a, d)
    }
    Xh(a, b) {
      let c = BufferWriter.aa(32, !1);
      c.Tf(b);
      this.pc(4, a, c)
    }
    Lg() {
      let a = this.xb.values(),
        b = a.next();
      for (; !b.done;) {
        let c = b.value;
        b = a.next();
        c.cb()
      }
      this.xb.clear()
    }
    Hd(a) {
      this.Lg();
      clearTimeout(this.fd);
      this.fd = null;
      this.ed = !1;
      clearInterval(this.Dh);
      clearTimeout(this.Uh);
      let b = this;
      a && (this.Uh =
        setTimeout(function() {
          b.ce()
        }, this.Sh + Math.random() * this.Th | 0))
    }
    vg(a) {
      let b = 0,
        c = a.Rb;
      for (; b < c.length;) this.$b.add(c[b++]);
      null != a.hb && this.Ac.add(a.hb);
      return {
        Fi: a.Rb,
        wi: a.hb
      }
    }
    Ed() {
      this.$b.clear();
      this.Ac.clear()
    }
    Dd(a) {
      let b = 0,
        c = a.Fi;
      for (; b < c.length;) this.$b.delete(c[b++]);
      this.Ac.delete(a.wi)
    }
    static Ve(a) {
      try {
        let b = HaxballParser.Bh(a.candidate);
        if ("srflx" == b.ni) return b.fh
      } catch (b) {}
      return null
    }
  }
  const Ha = HaxballRtcSessionManager;
  class Point2D {
    constructor(a, b) {
      this.x = a;
      this.y = b
    }
  }
  const I = Point2D;
  class HaxballDataParser {
    constructor(a, b) {
      null == b && (b = !1);
      this.j = a;
      this.ra = b;
      this.a =
        0
    }
    La(a) {
      null == a && (a = this.j.byteLength - this.a);
      if (this.a + a > this.j.byteLength) throw r.s("Read too much");
      let b = new Uint8Array(this.j.buffer, this.j.byteOffset + this.a, a);
      this.a += a;
      return b
    }
    Nh(a) {
      let b = this.La(a);
      a = new ArrayBuffer(a);
      (new Uint8Array(a)).set(b);
      return a
    }
    Vd() {
      return this.j.getInt8(this.a++)
    }
    C() {
      return this.j.getUint8(this.a++)
    }
    kc() {
      let a = this.j.getUint16(this.a, this.ra);
      this.a += 2;
      return a
    }
    H() {
      let a = this.j.getInt32(this.a, this.ra);
      this.a += 4;
      return a
    }
    Ob() {
      let a = this.j.getUint32(this.a, this.ra);
      this.a += 4;
      return a
    }
    Oh() {
      let a = this.j.getFloat32(this.a, this.ra);
      this.a += 4;
      return a
    }
    o() {
      let a = this.j.getFloat64(this.a, this.ra);
      this.a += 8;
      return a
    }
    nb() {
      let a = this.a,
        b = 0,
        c, d = 0;
      do c = this.j.getUint8(a + b), 5 > b && (d |= (c & 127) << 7 * b >>> 0), ++b; while (0 != (c & 128));
      this.a += b;
      return d | 0
    }
    ad(a) {
      let b = this.a,
        c, d = "";
      for (a = b + a; b < a;) c = HaxballDataParser.Jg(this.j, b), b += c.length, d += String.fromCodePoint(c.char);
      if (b != a) throw r.s("Actual string length differs from the specified: " + (b - a) + " bytes");
      this.a = b;
      return d
    }
    Ya() {
      let a = this.nb();
      return 0 >=
        a ? null : this.ad(a - 1)
    }
    mb() {
      return this.ad(this.nb())
    }
    xf() {
      let a = this.mb();
      return JSON.parse(a)
    }
    static Jg(a, b) {
      var c = a.getUint8(b);
      let d, e, f, g, k = b;
      if (0 == (c & 128)) ++b;
      else if (192 == (c & 224)) d = a.getUint8(b + 1), c = (c & 31) << 6 | d & 63, b += 2;
      else if (224 == (c & 240)) d = a.getUint8(b + 1), e = a.getUint8(b + 2), c = (c & 15) << 12 | (d & 63) << 6 |
        e & 63, b += 3;
      else if (240 == (c & 248)) d = a.getUint8(b + 1), e = a.getUint8(b + 2), f = a.getUint8(b + 3), c = (c & 7) <<
        18 | (d & 63) << 12 | (e & 63) << 6 | f & 63, b += 4;
      else if (248 == (c & 252)) d = a.getUint8(b + 1), e = a.getUint8(b + 2), f = a.getUint8(b +
          3), g = a.getUint8(b + 4), c = (c & 3) << 24 | (d & 63) << 18 | (e & 63) << 12 | (f & 63) << 6 | g & 63,
        b += 5;
      else if (252 == (c & 254)) d = a.getUint8(b + 1), e = a.getUint8(b + 2), f = a.getUint8(b + 3), g = a
        .getUint8(b + 4), a = a.getUint8(b + 5), c = (c & 1) << 30 | (d & 63) << 24 | (e & 63) << 18 | (f & 63) <<
        12 | (g & 63) << 6 | a & 63, b += 6;
      else throw r.s("Cannot decode UTF8 character at offset " + b + ": charCode (" + c + ") is invalid");
      return {
        char: c,
        length: b - k
      }
    }
  }
  const L = HaxballDataParser;
  class RequestProcessor {
    constructor(a) {
      this.hf = new CircularBuffer(15);
      this.Jd = 0;
      this.He = new Map;
      this.Tg = new RateLimiter(100, 16);
      this.cd = !1;
      this.$c = 0;
      this.jc = a;
      a = BufferWriter.aa(8);
      a.g(Math.random());
      this.dc = a.Bb()
    }
    ob(a, b) {
      null == b && (b = 0);
      this.jc.ob(b, a)
    }
  }
  const bb = RequestProcessor;
  class CallbackInvoker {
    static sa(a, b, c) {
      null != a && a(b, c)
    }
  }
  const Sa = CallbackInvoker;
  class HaxballMapsManager {
    constructor() {
      this.v = [];
      this.I = [];
      this.Y = [];
      this.Sa = [];
      this.A = [];
      this.Ta = [];
      this.Pb = [];
      this.Ib = [];
      this.Mb = new Ta;
      this.Fd = 255;
      this.Bd = this.Qd = 0;
      this.Cd = !0;
      this.dd = !1
    }
    Uc() {
      let a = new HaxballPhysicalEntity;
      a.T = 16777215;
      a.c = 63;
      a.m = 193;
      a.M = 10;
      a.ga = .99;
      a.L = 1;
      a.i = .5;
      return a
    }
    G(a) {
      a.f(this.Fd);
      if (!this.gh()) {
        a.Ca(this.oa);
        a.w(this.Ec);
        a.g(this.Fc);
        a.g(this.Dc);
        a.g(this.bc);
        a.g(this.ac);
        a.g(this.zd);
        a.w(this.Cc);
        a.g(this.cc);
        a.g(this.Gc);
        a.g(this.Ma);
        this.Mb.G(a);
        a.Oa(this.Qd);
        a.f(this.Bd);
        a.f(this.Cd ? 1 : 0);
        a.f(this.dd ? 1 : 0);
        a.f(this.v.length);
        for (var b = 0, c = this.v.length; b < c;) {
          var d = b++;
          let e = this.v[d];
          e.Kc = d;
          e.G(a)
        }
        a.f(this.I.length);
        b = 0;
        for (c = this.I; b < c.length;) c[b++].G(a);
        a.f(this.Y.length);
        b = 0;
        for (c = this.Y; b < c.length;) c[b++].G(a);
        a.f(this.Sa.length);
        b = 0;
        for (c = this.Sa; b < c.length;) c[b++].G(a);
        a.f(this.A.length);
        b = 0;
        for (c = this.A; b < c.length;) c[b++].G(a);
        a.f(this.Ta.length);
        b = 0;
        for (c = this.Ta; b < c.length;) c[b++].G(a);
        a.f(this.Pb.length);
        b = 0;
        for (c = this.Pb; b < c.length;) d = c[b], ++b, a.g(d.x), a.g(d.y);
        a.f(this.Ib.length);
        b = 0;
        for (c = this.Ib; b < c.length;) d = c[b], ++b, a.g(d.x), a.g(d.y)
      }
    }
    oi(a) {
      function b() {
        let f = [],
          g = a.C(),
          k = 0;
        for (; k < g;) {
          ++k;
          let l = new Point2D(0, 0);
          l.x = a.o();
          l.y = a.o();
          f.push(l)
        }
        return f
      }
      this.oa = a.Ya();
      this.Ec = a.H();
      this.Fc = a.o();
      this.Dc = a.o();
      this.bc = a.o();
      this.ac = a.o();
      this.zd = a.o();
      this.Cc = a.H();
      this.cc = a.o();
      this.Gc = a.o();
      this.Ma = a.o();
      this.Mb.pa(a);
      this.Qd = a.kc();
      this.Bd = a.C();
      this.Cd = 0 != a.C();
      this.dd = 0 != a.C();
      this.v = [];
      for (var c = a.C(), d = 0; d < c;) {
        var e = new DataContainer;
        e.pa(a);
        e.Kc = d++;
        this.v.push(e)
      }
      this.I = [];
      c = a.C();
      for (d = 0; d < c;) ++d, e = new VectorCalculation, e.pa(a, this.v), this.I.push(e);
      this.Y = [];
      c = a.C();
      for (d = 0; d < c;) ++d, e = new K, e.pa(a), this.Y.push(e);
      this.Sa = [];
      c = a.C();
      for (d = 0; d < c;) ++d, e = new PlayerPosition, e.pa(a), this.Sa.push(e);
      this.A = [];
      c = a.C();
      for (d = 0; d < c;) ++d, e = new HaxballPhysicalEntity, e.pa(a), this.A.push(e);
      this.Ta = [];
      c = a.C();
      for (d = 0; d < c;) ++d, e = new ForceCalculator, e.pa(a), this.Ta.push(e);
      this.Pb = b();
      this.Ib = b();
      this.Nb();
      if (!this.Rf()) throw r.s(new EmptyClass("Invalid stadium"));
    }
    Rf() {
      return 0 >= this.A.length || 0 > this.ac || 0 > this.bc || 0 > this.Mb.M ? !1 : !0
    }
    Nb() {
      let a = 0,
        b = this.I;
      for (; a < b.length;) b[a++].Nb()
    }
    gh() {
      return 255 != this.Fd
    }
    Kb(a, b) {
      a = a[b];
      return null != a ? HaxballTypeHelper.l(a, z) : 0
    }
    rh(a) {
      a = a.canBeStored;
      return null != a ? HaxballTypeHelper.l(a, Ya) : !0
    }

    kh(a) {
      let d = JSON5.parse(a);
      return khJson(d);
    }

    khJson(d) {
      function b(k) {
        let l = HaxballTypeHelper.l(k[0], z);
        k = HaxballTypeHelper.l(k[1], z);
        null == k && (k = 0);
        null == l && (l = 0);
        return new Point2D(l, k)
      }

      function c(k, l, p, t) {
        null == t && (t = !1);
        var x = d[l];
        if (!t || null != x)
          if (t = HaxballTypeHelper.l(x, Array), null != t)
            for (x = 0; x < t.length;) {
              let B = t[x];
              ++x;
              try {
                HaxballMapsManager.tg(B, f), k.push(p(B))
              } catch (N) {
                throw r.s(new EmptyClass('Error in "' +
                  l + '" index: ' + k.length));
              }
            }
      }

      this.v = [];
      this.I = [];
      this.Y = [];
      this.Sa = [];
      this.A = [];
      this.Ta = [];
      this.oa = HaxballTypeHelper.l(d.name, String);
      this.cc = HaxballTypeHelper.l(d.width, z);
      this.Gc = HaxballTypeHelper.l(d.height, z);
      this.Qd = this.Kb(d, "maxViewWidth") | 0;
      "player" == d.cameraFollow && (this.Bd = 1);
      this.Ma = 200;
      let a = d.spawnDistance;
      null != a && (this.Ma = HaxballTypeHelper.l(a, z));
      a = d.bg;
      let e;
      switch (a.type) {
        case "grass":
          e = 1;
          break;
        case "hockey":
          e = 2;
          break;
        default:
          e = 0
      }
      this.Ec = e;
      this.Fc = this.Kb(a, "width");
      this.Dc = this.Kb(a, "height");
      this.bc = this.Kb(a, "kickOffRadius");
      this.ac = this.Kb(a, "cornerRadius");
      this.Cc = 7441498;
      null != a.color && (this.Cc = HaxballMapsManager.Sc(a.color));
      this.zd = this.Kb(a, "goalLine");
      this.Cd = this.rh(d);
      this.dd = "full" == d.kickOffReset;
      let f = d.traits;
      a = d.ballPhysics;
      "disc0" != a && (null != a ? (a = HaxballMapsManager.df(a, this.Uc()), a.m |= 192, this.A.push(a)) : this.A.push(this.Uc()));
      c(this.v, "vertexes", HaxballMapsManager.qh);
      let g = this;
      c(this.I, "segments", function(k) {
        return HaxballMapsManager.ph(k, g.v)
      });
      c(this.Sa, "goals", HaxballMapsManager.lh);
      c(this.A, "discs", function(k) {
        return HaxballMapsManager.df(k, new HaxballPhysicalEntity)
      });
      c(this.Y, "planes", HaxballMapsManager.nh);
      c(this.Ta, "joints",
        function(k) {
          return HaxballMapsManager.mh(k, g.A)
        }, !0);
      c(this.Pb, "redSpawnPoints", b, !0);
      c(this.Ib, "blueSpawnPoints", b, !0);
      a = d.playerPhysics;
      null != a && (this.Mb = HaxballMapsManager.oh(a));
      if (255 < this.v.length || 255 < this.I.length || 255 < this.Y.length || 255 < this.Sa.length || 255 < this.A
        .length) throw r.s("Error");
      this.Nb();
      if (!this.Rf()) throw r.s(new EmptyClass("Invalid stadium"));
    }
    Ag(a, b) {
      let c = 0,
        d = this.Sa;
      for (; c < d.length;) {
        let k = d[c];
        ++c;
        var e = k.F,
          f = k.K,
          g = b.x - a.x;
        let l = b.y - a.y;
        0 < -(e.y - a.y) * g + (e.x - a.x) * l == 0 < -(f.y - a.y) * g + (f.x - a.x) * l ? e = !1 : (g = f.x - e.x,
          f = f.y -
          e.y, e = 0 < -(a.y - e.y) * g + (a.x - e.x) * f == 0 < -(b.y - e.y) * g + (b.x - e.x) * f ? !1 : !0);
        if (e) return k.rc
      }
      return HaxballActionContext.na
    }
    kb(a, b, c, d, e, f, g, k) {
      null == k && (k = 0);
      this.oa = a;
      this.A.push(this.Uc());
      this.cc = b;
      this.Gc = c;
      this.Ec = 1;
      this.Cc = 7441498;
      this.Fc = d;
      this.Dc = e;
      this.bc = g;
      this.ac = k;
      this.Ma = .75 * d;
      400 < this.Ma && (this.Ma = 400);
      a = new K;
      var l = a.X;
      l.x = 0;
      l.y = 1;
      a.ka = -c;
      a.i = 0;
      this.Y.push(a);
      a = new K;
      l = a.X;
      l.x = 0;
      l.y = -1;
      a.ka = -c;
      a.i = 0;
      this.Y.push(a);
      a = new K;
      l = a.X;
      l.x = 1;
      l.y = 0;
      a.ka = -b;
      a.i = 0;
      this.Y.push(a);
      a = new K;
      l = a.X;
      l.x = -1;
      l.y = 0;
      a.ka = -b;
      a.i =
        0;
      this.Y.push(a);
      this.Vc(d, 1, f, 13421823, HaxballActionContext.ta);
      this.Vc(-d, -1, f, 16764108, HaxballActionContext.fa);
      this.gf(g, c);
      b = new K;
      c = b.X;
      c.x = 0;
      c.y = 1;
      b.ka = -e;
      b.c = 1;
      this.Y.push(b);
      b = new K;
      c = b.X;
      c.x = 0;
      c.y = -1;
      b.ka = -e;
      b.c = 1;
      this.Y.push(b);
      b = new DataContainer;
      c = b.a;
      c.x = -d;
      c.y = -e;
      b.c = 0;
      c = new DataContainer;
      g = c.a;
      g.x = d;
      g.y = -e;
      c.c = 0;
      g = new DataContainer;
      a = g.a;
      a.x = d;
      a.y = -f;
      g.c = 0;
      a = new DataContainer;
      l = a.a;
      l.x = d;
      l.y = f;
      a.c = 0;
      l = new DataContainer;
      var p = l.a;
      p.x = d;
      p.y = e;
      l.c = 0;
      p = new DataContainer;
      var t = p.a;
      t.x = -d;
      t.y = e;
      p.c = 0;
      t = new DataContainer;
      var x = t.a;
      x.x = -d;
      x.y = f;
      t.c = 0;
      x = new DataContainer;
      var B = x.a;
      B.x = -d;
      B.y = -f;
      x.c = 0;
      f = new VectorCalculation;
      f.F = c;
      f.K = g;
      f.c = 1;
      f.va = !1;
      B = new VectorCalculation;
      B.F = a;
      B.K = l;
      B.c = 1;
      B.va = !1;
      let N = new VectorCalculation;
      N.F = p;
      N.K = t;
      N.c = 1;
      N.va = !1;
      let ta = new VectorCalculation;
      ta.F = x;
      ta.K = b;
      ta.c = 1;
      ta.va = !1;
      this.v.push(b);
      this.v.push(c);
      this.v.push(g);
      this.v.push(a);
      this.v.push(l);
      this.v.push(p);
      this.v.push(t);
      this.v.push(x);
      this.I.push(f);
      this.I.push(B);
      this.I.push(N);
      this.I.push(ta);
      this.ef(d, e, k);
      this.Nb()
    }
    ff(a, b, c, d, e, f, g, k) {
      this.oa = a;
      this.A.push(this.Uc());
      this.cc = b;
      this.Gc = c;
      this.Ec = 2;
      this.Fc = d;
      this.Dc = e;
      this.bc = 75;
      this.ac = k;
      this.zd = g;
      this.Ma = .75 * (d - g);
      400 < this.Ma && (this.Ma =
        400);
      a = new K;
      var l = a.X;
      l.x = 0;
      l.y = 1;
      a.ka = -c;
      a.i = 0;
      this.Y.push(a);
      a = new K;
      l = a.X;
      l.x = 0;
      l.y = -1;
      a.ka = -c;
      a.i = 0;
      this.Y.push(a);
      a = new K;
      l = a.X;
      l.x = 1;
      l.y = 0;
      a.ka = -b;
      a.i = 0;
      this.Y.push(a);
      a = new K;
      l = a.X;
      l.x = -1;
      l.y = 0;
      a.ka = -b;
      a.i = 0;
      this.Y.push(a);
      this.Vc(d - g, 1, f, 13421823, HaxballActionContext.ta, 63);
      this.Vc(-d + g, -1, f, 16764108, HaxballActionContext.fa, 63);
      this.gf(75, c);
      b = new K;
      c = b.X;
      c.x = 0;
      c.y = 1;
      b.ka = -e;
      b.c = 1;
      this.Y.push(b);
      b = new K;
      c = b.X;
      c.x = 0;
      c.y = -1;
      b.ka = -e;
      b.c = 1;
      this.Y.push(b);
      b = new K;
      c = b.X;
      c.x = 1;
      c.y = 0;
      b.ka = -d;
      b.c = 1;
      this.Y.push(b);
      b = new K;
      c = b.X;
      c.x = -1;
      c.y = 0;
      b.ka = -d;
      b.c = 1;
      this.Y.push(b);
      this.ef(d, e, k);
      this.Nb()
    }
    Vc(a, b, c, d, e, f) {
      var g;
      null == g && (g = 32);
      null == f && (f = 1);
      var k = new DataContainer,
        l = k.a;
      l.x = a + 8 * b;
      l.y = -c;
      l = new DataContainer;
      var p = l.a;
      p.x = a + 8 * b;
      p.y = c;
      let t = new DataContainer;
      p = t.a;
      p.x = k.a.x + 22 * b;
      p.y = k.a.y + 22;
      let x = new DataContainer;
      p = x.a;
      p.x = l.a.x + 22 * b;
      p.y = l.a.y - 22;
      p = new VectorCalculation;
      p.F = k;
      p.K = t;
      p.bb(90 * b);
      let B = new VectorCalculation;
      B.F = x;
      B.K = t;
      let N = new VectorCalculation;
      N.F = x;
      N.K = l;
      N.bb(90 * b);
      b = this.v.length;
      this.v.push(k);
      this.v.push(l);
      this.v.push(t);
      this.v.push(x);
      k = b;
      for (b = this.v.length; k < b;) l = k++, this.v[l].c = f, this.v[l].m =
        g, this.v[l].i = .1;
      b = this.I.length;
      this.I.push(p);
      this.I.push(B);
      this.I.push(N);
      k = b;
      for (b = this.I.length; k < b;) l = k++, this.I[l].c = f, this.I[l].m = g, this.I[l].i = .1;
      f = new HaxballPhysicalEntity;
      g = f.a;
      g.x = a;
      g.y = -c;
      f.L = 0;
      f.M = 8;
      f.T = d;
      this.A.push(f);
      f = new HaxballPhysicalEntity;
      g = f.a;
      g.x = a;
      g.y = c;
      f.L = 0;
      f.M = 8;
      f.T = d;
      this.A.push(f);
      d = new PlayerPosition;
      f = d.F;
      f.x = a;
      f.y = -c;
      f = d.K;
      f.x = a;
      f.y = c;
      d.rc = e;
      this.Sa.push(d)
    }
    gf(a, b) {
      let c = new DataContainer;
      var d = c.a;
      d.x = 0;
      d.y = -b;
      c.i = .1;
      c.m = 24;
      c.c = 6;
      d = new DataContainer;
      var e = d.a;
      e.x = 0;
      e.y = -a;
      d.i = .1;
      d.m = 24;
      d.c = 6;
      e = new DataContainer;
      var f = e.a;
      f.x = 0;
      f.y = a;
      e.i = .1;
      e.m =
        24;
      e.c = 6;
      a = new DataContainer;
      f = a.a;
      f.x = 0;
      f.y = b;
      a.i = .1;
      a.m = 24;
      a.c = 6;
      b = new VectorCalculation;
      b.F = c;
      b.K = d;
      b.m = 24;
      b.c = 6;
      b.va = !1;
      b.i = .1;
      f = new VectorCalculation;
      f.F = e;
      f.K = a;
      f.m = 24;
      f.c = 6;
      f.va = !1;
      f.i = .1;
      let g = new VectorCalculation;
      g.F = d;
      g.K = e;
      g.m = 8;
      g.c = 6;
      g.va = !1;
      g.bb(180);
      g.i = .1;
      let k = new VectorCalculation;
      k.F = e;
      k.K = d;
      k.m = 16;
      k.c = 6;
      k.va = !1;
      k.bb(180);
      k.i = .1;
      this.v.push(c);
      this.v.push(d);
      this.v.push(e);
      this.v.push(a);
      this.I.push(b);
      this.I.push(f);
      this.I.push(g);
      this.I.push(k)
    }
    ef(a, b, c) {
      if (!(0 >= c)) {
        var d = new DataContainer,
          e = d.a;
        e.x = -a + c;
        e.y = -b;
        d.c = 0;
        e = new DataContainer;
        var f = e.a;
        f.x = -a;
        f.y = -b + c;
        e.c = 0;
        f = new DataContainer;
        var g = f.a;
        g.x = -a + c;
        g.y = b;
        f.c = 0;
        g = new DataContainer;
        var k = g.a;
        k.x = -a;
        k.y = b - c;
        g.c = 0;
        k = new DataContainer;
        var l = k.a;
        l.x = a - c;
        l.y = b;
        k.c = 0;
        l = new DataContainer;
        var p = l.a;
        p.x = a;
        p.y = b - c;
        l.c = 0;
        p = new DataContainer;
        var t = p.a;
        t.x = a - c;
        t.y = -b;
        p.c = 0;
        t = new DataContainer;
        var x = t.a;
        x.x = a;
        x.y = -b + c;
        t.c = 0;
        a = new VectorCalculation;
        a.F = d;
        a.K = e;
        a.c = 1;
        a.va = !1;
        a.i = 1;
        a.bb(-90);
        b = new VectorCalculation;
        b.F = f;
        b.K = g;
        b.c = 1;
        b.va = !1;
        b.i = 1;
        b.bb(90);
        c = new VectorCalculation;
        c.F = k;
        c.K = l;
        c.c = 1;
        c.va = !1;
        c.i = 1;
        c.bb(-90);
        x = new VectorCalculation;
        x.F = p;
        x.K = t;
        x.c = 1;
        x.va = !1;
        x.i = 1;
        x.bb(90);
        this.v.push(d);
        this.v.push(e);
        this.v.push(f);
        this.v.push(g);
        this.v.push(k);
        this.v.push(l);
        this.v.push(p);
        this.v.push(t);
        this.I.push(a);
        this.I.push(b);
        this.I.push(c);
        this.I.push(x)
      }
    }
    static pa(a) {
      var b = a.C();
      return 255 == b ? (b = new HaxballMapsManager, b.oi(a), b) : HaxballMapsManager.Gd()[b]
    }
    static Gd() {
      if (null == HaxballMapsManager.wa) {
        HaxballMapsManager.wa = [];
        var a = new HaxballMapsManager;
        a.kb("Classic", 420, 200, 370, 170, 64, 75);
        HaxballMapsManager.wa.push(a);
        a = new HaxballMapsManager;
        a.kb("Easy", 420, 200, 370, 170, 90, 75);
        HaxballMapsManager.wa.push(a);
        a = new HaxballMapsManager;
        a.kb("Small", 420, 200, 320, 130, 55, 70);
        HaxballMapsManager.wa.push(a);
        a = new HaxballMapsManager;
        a.kb("Big", 600, 270, 550, 240, 80, 80);
        HaxballMapsManager.wa.push(a);
        a = new HaxballMapsManager;
        a.kb("Rounded", 420, 200, 370, 170, 64, 75, 75);
        HaxballMapsManager.wa.push(a);
        a = new HaxballMapsManager;
        a.ff("Hockey",
          420, 204, 398, 182, 68, 120, 100);
        HaxballMapsManager.wa.push(a);
        a = new HaxballMapsManager;
        a.ff("Big Hockey", 600, 270, 550, 240, 90, 160, 150);
        HaxballMapsManager.wa.push(a);
        a = new HaxballMapsManager;
        a.kb("Big Easy", 600, 270, 550, 240, 95, 80);
        HaxballMapsManager.wa.push(a);
        a = new HaxballMapsManager;
        a.kb("Big Rounded", 600, 270, 550, 240, 80, 75, 100);
        HaxballMapsManager.wa.push(a);
        a = new HaxballMapsManager;
        a.kb("Huge", 750, 350, 700, 320, 100, 80);
        HaxballMapsManager.wa.push(a);
        a = 0;
        let b = HaxballMapsManager.wa.length;
        for (; a < b;) {
          let c = a++;
          HaxballMapsManager.wa[c].Fd = c
        }
      }
      return HaxballMapsManager.wa
    }
    static tg(a, b) {
      if (null != a.trait && (b = b[HaxballTypeHelper.l(a.trait, String)], null != b)) {
        let c = 0,
          d = ObjectPropertyFilter.zi(b);
        for (; c < d.length;) {
          let e = d[c];
          ++c;
          null == a[e] && (a[e] = b[e])
        }
      }
    }
    static Ua(a) {
      a =
        HaxballTypeHelper.l(a, Array);
      let b = 0,
        c = 0;
      for (; c < a.length;) switch (a[c++]) {
        case "all":
          b |= 63;
          break;
        case "ball":
          b |= 1;
          break;
        case "blue":
          b |= 4;
          break;
        case "blueKO":
          b |= 16;
          break;
        case "c0":
          b |= 268435456;
          break;
        case "c1":
          b |= 536870912;
          break;
        case "c2":
          b |= 1073741824;
          break;
        case "c3":
          b |= -2147483648;
          break;
        case "kick":
          b |= 64;
          break;
        case "red":
          b |= 2;
          break;
        case "redKO":
          b |= 8;
          break;
        case "score":
          b |= 128;
          break;
        case "wall":
          b |= 32
      }
      return b
    }
    static Sc(a) {
      if ("transparent" == a) return -1;
      if ("string" == typeof a) return HaxballUtils.parseInt("0x" + HaxballUtils.xe(a));
      if (a instanceof Array) return ((a[0] | 0) << 16) + ((a[1] | 0) << 8) + (a[2] | 0);
      throw r.s("Bad color");
    }
    static qh(a) {
      let b = new DataContainer;
      b.a.x = HaxballTypeHelper.l(a.x, z);
      b.a.y = HaxballTypeHelper.l(a.y, z);
      var c = a.bCoef;
      null != c && (b.i = HaxballTypeHelper.l(c, z));
      c = a.cMask;
      null != c && (b.c = HaxballMapsManager.Ua(c));
      a = a.cGroup;
      null != a && (b.m = HaxballMapsManager.Ua(a));
      return b
    }
    static ph(a, b) {
      let c = new VectorCalculation;
      var d = HaxballTypeHelper.l(a.v1, za);
      c.F = b[HaxballTypeHelper.l(a.v0, za)];
      c.K = b[d];
      b = a.bias;
      d = a.bCoef;
      let e = a.curve,
        f = a.curveF,
        g = a.vis,
        k = a.cMask,
        l = a.cGroup;
      a = a.color;
      null != b && (c.ub = HaxballTypeHelper.l(b, z));
      null != d && (c.i = HaxballTypeHelper.l(d, z));
      null != f ? c.Ha = HaxballTypeHelper.l(f, z) : null != e && c.bb(HaxballTypeHelper.l(e, z));
      null !=
        g && (c.va = HaxballTypeHelper.l(g, Ya));
      null != k && (c.c = HaxballMapsManager.Ua(k));
      null != l && (c.m = HaxballMapsManager.Ua(l));
      null != a && (c.T = HaxballMapsManager.Sc(a));
      return c
    }
    static mh(a, b) {
      let c = new ForceCalculator;
      var d = HaxballTypeHelper.l(a.d0, za),
        e = HaxballTypeHelper.l(a.d1, za);
      let f = a.color,
        g = a.strength;
      a = a.length;
      if (d >= b.length || 0 > d) throw r.s(null);
      if (e >= b.length || 0 > e) throw r.s(null);
      c.Ic = d;
      c.Jc = e;
      null == a ? (d = b[d], e = b[e], null == d || null == e ? c.Va = c.Ka = 100 : (b = d.a, d = e.a, e = b.x - d
        .x, b = b.y - d.y, c.Va = c.Ka = Math.sqrt(e * e + b * b))) : a instanceof Array ? (c.Ka = HaxballTypeHelper.l(a[0], z), c
        .Va = HaxballTypeHelper.l(a[1], z)) : c.Va = c.Ka = HaxballTypeHelper.l(a, z);
      c.qc = null == g || "rigid" == g ?
        1 / 0 : HaxballTypeHelper.l(g, z);
      null != f && (c.T = HaxballMapsManager.Sc(f));
      return c
    }
    static nh(a) {
      let b = new K;
      var c = HaxballTypeHelper.l(a.normal, Array),
        d = HaxballTypeHelper.l(c[0], z),
        e = HaxballTypeHelper.l(c[1], z);
      c = b.X;
      let f = d;
      var g = e;
      null == e && (g = 0);
      null == d && (f = 0);
      d = f;
      e = Math.sqrt(d * d + g * g);
      c.x = d / e;
      c.y = g / e;
      b.ka = HaxballTypeHelper.l(a.dist, z);
      c = a.bCoef;
      d = a.cMask;
      a = a.cGroup;
      null != c && (b.i = HaxballTypeHelper.l(c, z));
      null != d && (b.c = HaxballMapsManager.Ua(d));
      null != a && (b.m = HaxballMapsManager.Ua(a));
      return b
    }
    static lh(a) {
      let b = new PlayerPosition;
      var c = HaxballTypeHelper.l(a.p0, Array);
      let d = HaxballTypeHelper.l(a.p1, Array),
        e = b.F;
      e.x = c[0];
      e.y = c[1];
      c = b.K;
      c.x = d[0];
      c.y = d[1];
      switch (a.team) {
        case "blue":
          a = HaxballActionContext.ta;
          break;
        case "red":
          a = HaxballActionContext.fa;
          break;
        default:
          throw r.s("Bad team value");
      }
      b.rc = a;
      return b
    }
    static oh(a) {
      let b = new Ta;
      var c = a.bCoef,
        d = a.invMass;
      let e = a.damping,
        f = a.acceleration,
        g = a.kickingAcceleration,
        k = a.kickingDamping,
        l = a.kickStrength,
        p = a.gravity,
        t = a.cGroup,
        x = a.radius;
      a = a.kickback;
      null != c && (b.i = HaxballTypeHelper.l(c, z));
      null != d && (b.L = HaxballTypeHelper.l(d, z));
      null != e && (b.ga = HaxballTypeHelper.l(e, z));
      null != f && (b.zc = HaxballTypeHelper.l(f, z));
      null != g && (b.Oc = HaxballTypeHelper.l(g, z));
      null != k && (b.Pc = HaxballTypeHelper.l(k, z));
      null != l && (b.Mc = HaxballTypeHelper.l(l, z));
      null != p && (c = b.la, d = HaxballTypeHelper.l(p[1], z), c.x = HaxballTypeHelper.l(p[0], z), c.y = d);
      null !=
        t && (b.m = HaxballMapsManager.Ua(t));
      null != x && (b.M = HaxballTypeHelper.l(x, z));
      null != a && (b.Nc = HaxballTypeHelper.l(a, z));
      return b
    }
    static df(a, b) {
      var c = a.pos,
        d = a.speed;
      let e = a.gravity,
        f = a.radius,
        g = a.bCoef,
        k = a.invMass,
        l = a.damping,
        p = a.color,
        t = a.cMask;
      a = a.cGroup;
      if (null != c) {
        let x = b.a;
        x.x = c[0];
        x.y = c[1]
      }
      null != d && (c = b.u, c.x = d[0], c.y = d[1]);
      null != e && (d = b.la, d.x = e[0], d.y = e[1]);
      null != f && (b.M = HaxballTypeHelper.l(f, z));
      null != g && (b.i = HaxballTypeHelper.l(g, z));
      null != k && (b.L = HaxballTypeHelper.l(k, z));
      null != l && (b.ga = HaxballTypeHelper.l(l, z));
      null != p && (b.T = HaxballMapsManager.Sc(p));
      null != t && (b.c = HaxballMapsManager.Ua(t));
      null != a && (b.m = HaxballMapsManager.Ua(a));
      return b
    }
  }
  const w = HaxballMapsManager;
  class HaxballActionContext {
    constructor(a,
      b, c, d, e, f, g, k) {
      this.Zc = null;
      this.S = a;
      this.T = b;
      this.Qe = c;
      this.ih = d;
      this.oa = e;
      this.m = k;
      this.hi = new X;
      this.hi.Qa.push(b)
    }
  }
  const u = HaxballActionContext;
  class OtherPoint2D {
    constructor(a, b) {
      this.x = a;
      this.y = b
    }
  }
  const lb = OtherPoint2D;
  class PromiseTimeout {
    static li(a) {
      return new Promise(function(b, c) {
        let d = setTimeout(function() {
          c("Timed out")
        }, 500);
        a.then(function(e) {
          clearTimeout(d);
          b(e)
        }, function(e) {
          clearTimeout(d);
          c(e)
        })
      })
    }
  }
  const tb = PromiseTimeout;
  class mb {}
  class CircularBuffer {
    constructor(a) {
      let b = [],
        c = 0;
      for (; c < a;) ++c, b.push(0);
      this.gd = b;
      this.tc = this.hc = 0
    }
    qg(a) {
      this.tc -= this.gd[this.hc];
      this.gd[this.hc] =
        a;
      this.tc += a;
      this.hc++;
      this.hc >= this.gd.length && (this.hc = 0)
    }
    ug() {
      return this.tc / this.gd.length
    }
  }
  const cb = CircularBuffer;
  class WebSocketConnection {
    constructor(a) {
      this.hb = null;
      this.Qh = 1E4;
      this.Lc = !0;
      a.Me();
      this.qa = a.qa;
      this.jb = a.jb;
      this.Rb = a.Rb;
      this.hb = a.hb;
      this.Nf = performance.now();
      let b = null,
        c = this;
      b = function() {
        var e = c.Qh - c.ki();
        0 >= e ? c.cb() : (clearTimeout(c.Of), e = setTimeout(b, e + 1E3), c.Of = e)
      };
      b();
      this.qa.oniceconnectionstatechange = function() {
        let e = c.qa.iceConnectionState;
        "closed" != e && "failed" != e || c.cb()
      };
      a = 0;
      let d = this.jb;
      for (; a < d.length;) {
        let e = d[a];
        ++a;
        e.onmessage = function(f) {
          c.Lc && (c.Nf = performance.now(), null != c.nf && c.nf(f.data))
        };
        e.onclose = function() {
          c.cb()
        }
      }
    }
    ki() {
      return performance.now() - this.Nf
    }
    ob(a, b) {
      if (this.Lc && (a = this.jb[a], "open" == a.readyState)) {
        b = b.fe();
        try {
          a.send(b)
        } catch (c) {
          b = r.Vb(c).Hb(), va.console.log(b)
        }
      }
    }
    cb() {
      clearTimeout(this.Of);
      this.Lc && (this.Lc = !1, this.qa.close(), null != this.mf && this.mf())
    }
  }
  const ab = WebSocketConnection;
  class CallbackHandler2 {
    static sa(a, b, c, d) {
      null != a && a(b, c, d)
    }
  }
  const jb = CallbackHandler2;
  class OrderedList {
    constructor() {
      this.list = []
    }
    Di(a) {
      let b =
        0,
        c = a.eb,
        d = a.fb,
        e = 0,
        f = this.list;
      for (; e < f.length;) {
        var g = f[e];
        ++e;
        let k = g.eb;
        if (k > c) break;
        if (k == c) {
          g = g.fb;
          if (g > d) break;
          g == d && ++d
        }++b
      }
      a.fb = d;
      this.list.splice(b, 0, a)
    }
  }
  const db = OrderedList;
  class HaxballApiManager {
    static sh() {
      rb.Ci();
      HaxballGeoLocation.Sg().then(function(a) {
        HaxballApiManager.Se = a
      }, function() {}).then(function() {
        promiseResolve(HaxballApiManager.fi);
        let a = onHBLoaded;
        null != a && a()
      });
      HaxballApiManager.Vh = null
    }
    static bi(a, b, c) {
      null == HaxballApiManager.bd && (HaxballApiManager.bd = null, HaxballApiManager.Ph = a.render(HaxballApiManager.bd, {
        sitekey: b,
        callback: function(d) {
          null !=
            HaxballApiManager.Wd && HaxballApiManager.Wd(d)
        }
      }));
      HaxballApiManager.bd.hidden = !1;
      a.reset(HaxballApiManager.Ph);
      HaxballApiManager.Wd = function(d) {
        setTimeout(function() {
          HaxballApiManager.bd.hidden = !0;
          c(d)
        }, 1E3);
        HaxballApiManager.Wd = null
      }
    }
    static uh(a, b) {
      return "https://www.haxball.com/play?c=" + a + (b ? "&p=1" : "")
    }
    static fi(a) {
      function b() {
        if (!l) {
          var h = new HaxballShortPlayerData;
          h.pi = 9;
          h.oa = y.Xd;
          h.ba = y.ba.length - (x ? 0 : 1);
          h.xh = D.Wc;
          h.ib = Ka.ib;
          h.lb = null != D.lb;
          h.Rc = Ka.Rc;
          h.Tc = Ka.Tc;
          var n = BufferWriter.aa(16);
          h.G(n);
          D.be(n.fe())
        }
      }

      function c(h) {
        nb.then(function() {
          D.nc(h)
        })
      }

      function d(h) {
        return null == h ? null : {
          x: h.a.x,
          y: h.a.y,
          xspeed: h.u.x,
          yspeed: h.u.y,
          xgravity: h.la.x,
          ygravity: h.la.y,
          radius: h.M,
          bCoeff: h.i,
          invMass: h.L,
          damping: h.ga,
          color: h.T,
          cMask: h.c,
          cGroup: h.m
        }
      }

      function e() {
        return null == y.D ? null : {
          red: y.D.zb,
          blue: y.D.vb,
          time: y.D.Lb,
          scoreLimit: y.D.ab,
          timeLimit: 60 * y.D.Na
        }
      }

      function f(h) {
        if (null == h) return null;
        let n = null,
          v = h.N;
        null != v && (n = {
          x: v.a.x,
          y: v.a.y
        });
        return {
          name: h.oa,
          team: h.ja.S,
          id: h.ma,
          admin: h.Ub,
          position: n
        }
      }

      function g(h, n) {
        h = a[h];
        return null == h ? n : HaxballTypeHelper.l(h, String)
      }

      function k(h, n) {
        h = a[h];
        return null == h ? n : h
      }
      if (HaxballApiManager.Ff) throw r.s("Can't init twice");
      HaxballApiManager.Ff = !0;
      proxyAgent = k("proxy", null) ? new HttpsProxyAgent(url.parse(k("proxy", null))) : null;
      debug = k("debug", null) == true;
      let l = !k("public", !1);
      var p = g("roomName", "Headless Room");
      let t = g("playerName", "Host"),
        x = k("noPlayer", !1),
        B = HaxballTypeHelper.l(k("maxPlayers", 12), za),
        N = g("password", null),
        ta = g("token", null),
        ub = k("geo", null),
        Ka = HaxballApiManager.Se;
      if (null != ub && (Ka = HaxballGeoLocation.Te(ub), 3 < Ka.ib.length)) throw r.s("Invalid country code");
      let y = new HaxballPlayerManager;
      y.Xd = p;
      x || (p = new HaxballPlayerData, p.oa = t, p.Ub = !0, p.country = Ka.ib, y.ba.push(p));
      let D = new RtcStateQueueManager({
        iceServers: wa.Md,
        Ei: wa.Ke + "api/host",
        state: y,
        version: 9,
        Gi: ta
      });
      D.Wc = 2 > B ? 2 : 30 < B ? 30 : B;
      D.lb = N;
      let nb = Promise.resolve();
      b();
      let eb = null,
        J = {
          sendChat: function(h, n) {
            let v = new ChatMessageHandler;
            v.Pa = h;
            null != n ? nb.then(function() {
              D.Df(v, n)
            }) : c(v)
          },
          sendAnnouncement: function(h, n, v, G, H) {
            G = {
              bold: 1,
              italic: 2,
              small: 3,
              "small-bold": 4,
              "small-italic": 5,
            } [G];
            null == G && (G = 0);
            null == v && (v = -1);
            null == H && (H = 1);
            let ja = StyledMessageHandler.V(h, v, G, H);
            null != n ? nb.then(function() {
              D.Df(ja, n)
            }) : c(ja)
          },
          setPlayerAdmin: function(h, n) {
            c(GiveAdminActionHandler.V(h, n))
          },
          setPlayerTeam: function(h, n) {
            c(GameStartStopSwitcher.V(h, 1 == n ? HaxballActionContext.fa : 2 == n ? HaxballActionContext.ta : HaxballActionContext.na))
          },
          setPlayerAvatar: function(h, n) {
            c(AvatarHandler2.V(h, n))
          },
          setPlayerNoX: function(h, n) {
            // h = y.R(h);
            // console.log(`setPlayerNoX ${h} = ${n}`);
            if (h) {
              // h.noX = n;
              if (n) {
                global.PlayerNoX.add(h);
                global.PlayerInput.get(h).no_x = true;
              } else {
                global.PlayerNoX.delete(h);
                global.PlayerInput.get(h).no_x = false;
              }
              ActionLog(`setPlayerNoX ${h} = ${n}`);
            }
          },
          setGhostPlayer: function (h, n) {
            if (h) {
              // TODO
              // if (n) global.PlayerGhost.set(h, n);
              // else global.PlayerGhost.delete(h);
              // ActionLog(`PlayerGhost ${h} = ${n}`);
            }
          },
          clearGhostPlayers: function () {
            // global.PlayerGhost.clear();
            // ActionLog(`clearGhostPlayers`);
          },
          kickPlayer: function(h, n, v) {
            null == n && (n = "");
            c(PlayerRemovalHandler.V(h,
              n, v))
          },
          clearBan: function(h) {
            D.Dd(h)
          },
          clearBans: function() {
            D.Ed()
          },
          setScoreLimit: function(h) {
            c(ValueSetterActionHandler.V(0, h))
          },
          setTimeLimit: function(h) {
            c(ValueSetterActionHandler.V(1, h))
          },
          setCustomStadium: function(h) {
            let n = new HaxballMapsManager;
            try {
              n.kh(h)
            } catch (v) {
              throw r.s(r.Vb(v).Hb());
            }
            c(MapDataCompressionHandler.V(n))
          },
          setCustomStadiumJson: function(h) {
            let n = new HaxballMapsManager;
            try {
              n.khJson(h)
            } catch (v) {
              throw r.s(r.Vb(v).Hb());
            }
            c(MapDataCompressionHandler.V(n))
          },
          setDefaultStadium: function(h) {
            let n = HaxballMapsManager.Gd(),
              v = null,
              G = 0;
            for (; G < n.length;) {
              let H = n[G];
              ++G;
              if (H.oa == h) {
                v = H;
                break
              }
            }
            if (null == v) throw r.s("Stadium doesn't exist");
            c(MapDataCompressionHandler.V(v))
          },
          setDiscProperties: function(h, n) {
            c(PhysicsUpdateHandler.ag(h, !1, n))
          },
          setPlayerDiscProperties: function(h, n) {
            c(PhysicsUpdateHandler.ag(h,
              !0, n))
          },
          setTeamColors: function(h, n, v, G) {
            let H = new ActionContextHandler,
              ja = new X;
            H.rd = ja;
            H.ja = 1 == h ? HaxballActionContext.fa : 2 == h ? HaxballActionContext.ta : HaxballActionContext.na;
            ja.Qa = [];
            var fb = G.length;
            h = 0;
            for (fb = 3 > fb ? fb : 3; h < fb;) ja.Qa.push(G[h++] | 0);
            ja.de = v | 0;
            ja.Je = 256 * n / 360 | 0;
            c(H)
          },
          setKickRateLimit: function(h, n, v) {
            null == h && (h = 2);
            null == n && (n = 0);
            null == v && (v = 0);
            h = RateAdjuster.V(h, n, v);
            c(h)
          },
          startGame: function() {
            c(new SomeSmallActionHandler)
          },
          stopGame: function() {
            c(new CleanupActionHandler)
          },
          pauseGame: function(h) {
            let n = new MatchFlagToggler;
            n.wc = h;
            c(n)
          },
          setTeamsLock: function(h) {
            let n = new ValueChangeHandler;
            n.newValue = h;
            c(n)
          },
          setPassword: function(h) {
            D.lb =
              null == h ? null : HaxballTypeHelper.l(h, String);
            b()
          },
          setRequireRecaptcha: function(h) {
            D.ae(HaxballTypeHelper.l(h, Ya))
          },
          getPlayerList: function() {
            let h = [],
              n = 0,
              v = y.ba;
            for (; n < v.length;) h.push(f(v[n++]));
            return h
          },
          getPlayer: function(h) {
            h = y.R(h);
            return null == h ? null : f(h)
          },
          getScores: function() {
            return e()
          },
          getBallPosition: function() {
            var h = y.D;
            if (null == h) return null;
            h = h.ia.A[0].a;
            return {
              x: h.x,
              y: h.y
            }
          },
          getPlayerDiscProperties: function(h) {
            if (null == y.D) return null;
            h = y.R(h);
            return null == h ? null : d(h.N)
          },
          getDiscProperties: function(h) {
            let n = y.D;
            return null ==
              n ? null : d(n.ia.A[h])
          },
          getDiscCount: function() {
            let h = y.D;
            return null == h ? 0 : h.ia.A.length
          },
          startRecording: function() {
            eb = new DataCompressor(D, 3)
          },
          stopRecording: function() {
            if (null == eb) return null;
            let h = eb.stop();
            eb = null;
            return h
          },
          reorderPlayers: function(h, n) {
            c(PlayerReorderHandler.V(h, n))
          },
          CollisionFlags: {
            ball: 1,
            red: 2,
            blue: 4,
            redKO: 8,
            blueKO: 16,
            wall: 32,
            kick: 64,
            score: 128,
            c0: 268435456,
            c1: 536870912,
            c2: 1073741824,
            c3: -2147483648,
            all: 63
          }
        };
      D.ic = function(h, n) {
        RecaptchaLoader.jh().then(function(v) {
          HaxballApiManager.bi(v, h, n)
        })
      };
      setInterval(function() {
        D.Ba()
      }, 50);
      setInterval(function() {
          D.nc(CollectionSynchronizer.V(D))
        },
        3E3);
      D.kf = function(h) {
        null != y.R(h) && D.nc(PlayerRemovalHandler.V(h, "Bad actor", !1))
      };
      D.yh = function(h, n) {
        let v = n.mb();
        if (25 < v.length) throw r.s("name too long");
        let G = n.mb();
        if (3 < G.length) throw r.s("country too long");
        n = n.Ya();
        if (null != n && AvatarMaxLength < n.length) throw r.s("avatar too long");
        D.nc(PlayerRegistrationHandler.V(h, v, G, n));
        b()
      };
      D.zh = function(h) {
        null != y.R(h) && D.nc(PlayerRemovalHandler.V(h, null, !1))
      };
      D.Yc = function(h) {
        h = HaxballApiManager.uh(h, null != D.lb);
        HaxballApiManager.Vh = '<p>Room Link: <a href="' + h + '">' + h + "</a></p>";
        {
          let n = J.onRoomLink;
          null != n && n(h)
        }
      };
      y.Eh = function(h) {
        var n = D.wb.get(h.ma),
          v = null,
          G = null,
          real_ip = null,
          country = null,
          input = null;
        null != n && (v = n.Ig, G = n.jc.hb, real_ip = n.real_ip, country = h.country, input = h.input);
        // ActionLog(`real ip = ${real_ip} country = ${h.country}`);
        n = v;
        v = J.onPlayerJoin;
        if (null != v) {
          h = f(h);
          h.auth = n;
          h.conn = G;
          h.real_ip = real_ip;
          h.country = country;
          global.PlayerIsSpec.add(h.id);
          global.PlayerInput.set(h.id, input);
          v(h);
        // (h = f(h), h.auth = n, h.conn = G, h.real_ip = real_ip, h.country = country, v(h))
        }
      };
      y.Mf = function() {
        {
          let h = J.onTeamVictory;
          null != h && null != y.D && h(e())
        }
      };
      y.tf = function(h, n) {
        let v = J.onPlayerChat;
        return null == v ? !0 : 0 != v(f(h), n)
      };
      y.vf = function(h) {
        let n = J.onPlayerBallKick;
        null != n && n(f(h))
      };
      y.Lf = function(h) {
        let n = J.onTeamGoal;
        null != n && null != y.D && n(h.S)
      };
      y.Jf = function(h) {
        let n = J.onGameStart;
        null != n && n(f(h))
      };
      y.ld = function(h) {
        let n = J.onGameStop;
        null != n && n(f(h))
      };
      y.Gh = function (h, n) {
        let v =
          J.onPlayerTeamChange;
        if (null != v) {
          let c = f(n);
          // ActionLog(`onPlayerTeamChange n: ${n} id: ${c.id} t: ${c.team}`);
          if (!c.team) global.PlayerIsSpec.add(c.id);
          else global.PlayerIsSpec.delete(c.id);
          v(c, f(h))
      }
      };
      y.sf = function(h, n) {
        let v = J.onPlayerAdminChange;
        null != v && v(f(n), f(h))
      };
      y.Og = function() {
        let h = J.onGameTick;
        null != h && h()
      };
      y.Ch = function(h, n) {
        n = J[n ? "onGamePause" : "onGameUnpause"];
        null != n && n(f(h))
      };
      y.wf = function() {
        let h = J.onPositionsReset;
        null != h && h()
      };
      y.uf = function(h) {
        {
          let n = J.onPlayerActivity;
          null != n && n(f(h))
        }
      };
      y.Hf = function(h, n) {
        let v = J.onStadiumChange;
        null != v && v(n.oa, f(h))
      };
      y.Fh = function(h, n, v, G) {
        b();
        var H = J.onPlayerLeave;
        null != H && H(f(h));
        null != n && (H = null,
          null != G && (H = G.oa), D.Mg(h.ma, n, H, v), H = J.onPlayerKicked, null != H && H(f(h), n, v, f(G)))
      };
      y.hh = function(h, n, v, G) {
        let H = J.onKickRateLimitSet;
        null != H && H(n, v, G, f(h))
      };
      y.ii = function(h, n) {
        let v = J.onTeamsLockChange;
        null != v && v(n, f(h))
      };
      return J
    }
  }
  const F = HaxballApiManager;
  class HaxballGeoLocation {
    constructor() {
      this.ib = "";
      this.Rc = this.Tc = 0
    }
    static Te(a) {
      let b = new HaxballGeoLocation;
      b.Rc = a.lat;
      b.Tc = a.lon;
      b.ib = a.code.toLowerCase();
      return b
    }
    static Sg() {
      return HaxballHttpRequest.Rg(wa.Ke + "api/geo").then(function(a) {
        return HaxballGeoLocation.Te(a)
      })
    }
  }
  const ia = HaxballGeoLocation;
  class K {
    constructor() {
      this.m = 32;
      this.c = 63;
      this.i = 1;
      this.ka =
        0;
      this.X = new Point2D(0, 0)
    }
    G(a) {
      let b = this.X;
      a.g(b.x);
      a.g(b.y);
      a.g(this.ka);
      a.g(this.i);
      a.w(this.c);
      a.w(this.m)
    }
    pa(a) {
      let b = this.X;
      b.x = a.o();
      b.y = a.o();
      this.ka = a.o();
      this.i = a.o();
      this.c = a.H();
      this.m = a.H()
    }
  }
  class X {
    constructor() {
      this.de = 16777215;
      this.Qa = []
    }
    G(a) {
      a.f(this.Je);
      a.w(this.de);
      a.f(this.Qa.length);
      let b = 0,
        c = this.Qa;
      for (; b < c.length;) a.w(c[b++])
    }
    pa(a) {
      this.Je = a.C();
      this.de = a.H();
      let b = a.C();
      if (3 < b) throw r.s("too many");
      this.Qa = [];
      let c = 0;
      for (; c < b;) ++c, this.Qa.push(a.H())
    }
  }
  class Va {}
  class Ta {
    constructor() {
      this.Nc =
        0;
      this.M = 15;
      this.m = 0;
      this.la = new Point2D(0, 0);
      this.L = this.i = .5;
      this.ga = .96;
      this.zc = .1;
      this.Oc = .07;
      this.Pc = .96;
      this.Mc = 5
    }
    G(a) {
      a.g(this.i);
      a.g(this.L);
      a.g(this.ga);
      a.g(this.zc);
      a.g(this.Oc);
      a.g(this.Pc);
      a.g(this.Mc);
      let b = this.la;
      a.g(b.x);
      a.g(b.y);
      a.w(this.m);
      a.g(this.M);
      a.g(this.Nc)
    }
    pa(a) {
      this.i = a.o();
      this.L = a.o();
      this.ga = a.o();
      this.zc = a.o();
      this.Oc = a.o();
      this.Pc = a.o();
      this.Mc = a.o();
      let b = this.la;
      b.x = a.o();
      b.y = a.o();
      this.m = a.H();
      this.M = a.o();
      this.Nc = a.o()
    }
  }
  class RtcConnectionHandler {
    constructor(a, b, c) {
      this.hb = this.ee = null;
      this.Rb = [];
      this.Pe = 0;
      this.pf = !1;
      this.Ld = [];
      this.jb = [];
      this.qa = new RTCPeerConnection({
        iceServers: b
      }, RtcConnectionHandler.Fg);
      // console.log(`ICE iceServers: ${JSON.stringify(b, null, 2)}`);
      let d;
      this.Ye = new Promise(function(f) {
        d = f
      });
      let e = this;
      this.qa.onicecandidate = function(f) {
        // if (f.candidate) {
        //   console.log("ICE Candidate:", f.candidate.candidate);
        // } else {
        //   console.log("End of candidates");
        // }
        null == f.candidate ? d(e.Ld) : (f = f.candidate, null != f.candidate && "" != f.candidate && (null != e
          .Td && e.Td(f), e.Ld.push(f)))
      };
      for (b = 0; b < c.length;) this.Hg(c[b++]);
      this.S = a
    }
    gi() {
      var a;
      null == a && (a = 1E4);
      clearTimeout(this.ee);
      this.ee = setTimeout(getBoundFunction(this, this.dh), a)
    }
    async Gg(a, b) {
      await this.qa.setRemoteDescription(a);
      a = await this.qa.createAnswer();
      await this.qa.setLocalDescription(a);
      let c = 0;
      for (; c < b.length;) this.Ie(b[c++]);
      try {
        await PromiseTimeout.li(this.Ye)
      } catch (d) {}
      return a
    }
    Hg(a) {
      let b = {
        id: this.jb.length,
        negotiated: !0,
        ordered: a.ordered
      };
      a.reliable || (b.maxRetransmits = 0);
      a = this.qa.createDataChannel(a.name, b);
      a.binaryType = "arraybuffer";
      let c = this;
      a.onopen = function() {
        let d = 0,
          e = c.jb;
        for (; d < e.length;)
          if ("open" != e[d++].readyState) return;
        null != c.Rd && c.Rd()
      };
      a.onclose = function() {
        c.Id()
      };
      a.onmessage = function() {
        c.Id()
      };
      this.jb.push(a)
    }
    Ie(a) {
      let b = this;
      // TODO below modified
      setTimeout(function() {
        if (b.qa && b.qa.connectionState !== "closed") {
          b.qa.addIceCandidate(a).catch(console.error);
        }
      }, this.Pe)
      // TODO above modified
    }
    dh() {
      this.Id()
    }
    Id() {
      null != this.Sd && this.Sd();
      this.cb()
    }
    cb() {
      this.Me();
      this.qa.close()
    }
    Me() {
      clearTimeout(this.ee);
      this.Rd = this.Td = this.Sd = null;
      this.qa.onicecandidate = null;
      this.qa.ondatachannel = null;
      this.qa.onsignalingstatechange = null;
      this.qa.oniceconnectionstatechange = null;
      let a = 0,
        b = this.jb;
      for (; a < b.length;) {
        let c = b[a];
        ++a;
        c.onopen = null;
        c.onclose = null;
        c.onmessage = null
      }
    }
  }
  const sa = RtcConnectionHandler;
  class SomeInteractionManager {
    constructor() {
      this.A = []
    }
    G(a) {
      a.f(this.A.length);
      let b = 0,
        c = this.A.length;
      for (; b < c;) {
        let d = b++,
          e = this.A[d];
        e.rf = d;
        e.G(a)
      }
    }
    Ba(a) {
      for (var b = 0, c = this.A; b < c.length;) {
        var d = c[b];
        ++b;
        var e = d.a,
          f = d.a,
          g = d.u;
        e.x = f.x + g.x * a;
        e.y = f.y + g.y * a;
        f = e = d.u;
        g = d.la;
        d = d.ga;
        e.x = (f.x + g.x) * d;
        e.y = (f.y + g.y) * d
      }
      a = 0;
      for (b = this.A.length; a < b;) {
        d = a++;
        c = this.A[d];
        d += 1;
        for (e = this.A.length; d < e;) f = this.A[d++], 0 != (f.c & c.m) && 0 != (f.m & c.c) && c.Cg(f);
        if (0 != c.L) {
          d = 0;
          for (e = this.Y; d < e.length;)
            if (f = e[d], ++d, 0 != (f.c & c.m) && 0 != (f.m & c.c)) {
              g = f.X;
              var k = c.a;
              g = f.ka - (g.x * k.x + g.y * k.y) + c.M;
              if (0 < g) {
                var l = k =
                  c.a,
                  p = f.X;
                k.x = l.x + p.x * g;
                k.y = l.y + p.y * g;
                g = c.u;
                k = f.X;
                g = g.x * k.x + g.y * k.y;
                0 > g && (g *= c.i * f.i + 1, l = k = c.u, f = f.X, k.x = l.x - f.x * g, k.y = l.y - f.y * g)
              }
            } d = 0;
          for (e = this.I; d < e.length;) f = e[d], ++d, 0 != (f.c & c.m) && 0 != (f.m & c.c) && c.Dg(f);
          d = 0;
          for (e = this.v; d < e.length;)
            if (f = e[d], ++d, 0 != (f.c & c.m) && 0 != (f.m & c.c) && (k = c.a, l = f.a, g = k.x - l.x, k = k.y - l
                .y, l = g * g + k * k, 0 < l && l <= c.M * c.M)) {
              l = Math.sqrt(l);
              g /= l;
              k /= l;
              l = c.M - l;
              let t = p = c.a;
              p.x = t.x + g * l;
              p.y = t.y + k * l;
              l = c.u;
              l = g * l.x + k * l.y;
              0 > l && (l *= c.i * f.i + 1, p = f = c.u, f.x = p.x - g * l, f.y = p.y - k * l)
            }
        }
      }
      for (a = 0; 2 > a;)
        for (++a,
          b = 0, c = this.Ta; b < c.length;) c[b++].Ba(this.A)
    }
  }
  const Qa = SomeInteractionManager;
  class HaxballUtils {
    static xe(a) {
      return HaxballTypeHelper.Zb(a, "")
    }
    static parseInt(a) {
      a = parseInt(a);
      return isNaN(a) ? null : a
    }
  }
  const Oa = HaxballUtils;
  class HaxballPhysicalEntity {
    constructor() {
      this.c = this.m = 63;
      this.T = 16777215;
      this.ga = .99;
      this.L = 1;
      this.i = .5;
      this.M = 10;
      this.la = new Point2D(0, 0);
      this.u = new Point2D(0, 0);
      this.a = new Point2D(0, 0)
    }
    G(a) {
      // ActionLog(`HaxballPhysicalEntity m=${this.m} c=${this.c} T=${this.T} ga=${this.ga} L=${this.L} M=${this.M}`);
      var b = this.a;
      a.g(b.x);
      a.g(b.y);
      b = this.u;
      a.g(b.x);
      a.g(b.y);
      b = this.la;
      a.g(b.x);
      a.g(b.y);
      a.g(this.M);
      a.g(this.i);
      a.g(this.L);
      a.g(this.ga);
      a.xa(this.T);
      a.w(this.c);
      a.w(this.m)
    }
    pa(a) {
      var b = this.a;
      b.x = a.o();
      b.y =
        a.o();
      b = this.u;
      b.x = a.o();
      b.y = a.o();
      b = this.la;
      b.x = a.o();
      b.y = a.o();
      this.M = a.o();
      this.i = a.o();
      this.L = a.o();
      this.ga = a.o();
      this.T = a.Ob();
      this.c = a.H();
      this.m = a.H()
    }
    th() {
      let a = new PhysicsObject;
      this.Ze(a);
      return a
    }
    Ze(a) {
      var b = a.a,
        c = this.a;
      b.x = c.x;
      b.y = c.y;
      b = a.u;
      c = this.u;
      b.x = c.x;
      b.y = c.y;
      b = a.la;
      c = this.la;
      b.x = c.x;
      b.y = c.y;
      a.M = this.M;
      a.i = this.i;
      a.L = this.L;
      a.ga = this.ga;
      a.T = this.T;
      a.c = this.c;
      a.m = this.m
    }
  }
  const ha = HaxballPhysicalEntity;
  class StringHelper2 {
    static Wf(a, b) {
      a = a.charCodeAt(b);
      if (a == a) return a
    }
    static substr(a, b, c) {
      if (null == c) c = a.length;
      else if (0 > c)
        if (0 == b) c =
          a.length + c;
        else return "";
      return a.substr(b, c)
    }
    static remove(a, b) {
      b = a.indexOf(b);
      if (-1 == b) return !1;
      a.splice(b, 1);
      return !0
    }
    static now() {
      return Date.now()
    }
  }
  const P = StringHelper2;
  class StateManager2 {
    constructor(a) {
      StateManager2.Ja || this.Aa(a)
    }
    Aa(a) {
      this.da = 0;
      this.Fa = a
    }
  }
  const O = StateManager2;
  class HexConverter {
    static Bi(a) {
      let b = "";
      do b = "0123456789ABCDEF".charAt(a & 15) + b, a >>>= 4; while (0 < a);
      for (; 2 > b.length;) b = "0" + b;
      return b
    }
  }
  const qb = HexConverter;
  class EmptyClass {
    constructor() {}
  }
  const Ja = EmptyClass;
  class ForceCalculator {
    constructor() {
      this.T = 0;
      this.qc = 1 / 0;
      this.Ka = this.Va = 100;
      this.Ic = this.Jc = 0
    }
    G(a) {
      a.f(this.Ic);
      a.f(this.Jc);
      a.g(this.Ka);
      a.g(this.Va);
      a.g(this.qc);
      a.w(this.T)
    }
    pa(a) {
      this.Ic = a.C();
      this.Jc = a.C();
      this.Ka = a.o();
      this.Va = a.o();
      this.qc = a.o();
      this.T = a.H()
    }
    Ba(a) {
      var b = a[this.Ic];
      a = a[this.Jc];
      if (null != b && null != a) {
        var c = b.a,
          d = a.a,
          e = c.x - d.x;
        c = c.y - d.y;
        var f = Math.sqrt(e * e + c * c);
        if (!(0 >= f)) {
          e /= f;
          c /= f;
          d = b.L / (b.L + a.L);
          d != d && (d = .5);
          if (this.Ka >= this.Va) {
            var g = this.Ka;
            var k = 0
          } else if (f <= this.Ka) g = this.Ka, k = 1;
          else if (f >= this.Va) g = this.Va, k = -1;
          else return;
          f = g - f;
          if (0 == 0 * this.qc) d = this.qc * f * .5, e *= d, c *= d, k = d = b.u, b = b.L, d.x = k.x + e * b, d.y =
            k.y + c * b, d = b = a.u, a = a.L,
            b.x = d.x + -e * a, b.y = d.y + -c * a;
          else {
            g = f * d;
            var l = b.a,
              p = b.a;
            l.x = p.x + e * g * .5;
            l.y = p.y + c * g * .5;
            p = l = a.a;
            f -= g;
            l.x = p.x - e * f * .5;
            l.y = p.y - c * f * .5;
            f = b.u;
            g = a.u;
            f = e * (f.x - g.x) + c * (f.y - g.y);
            0 >= f * k && (d *= f, b = k = b.u, k.x = b.x - e * d, k.y = b.y - c * d, a = b = a.u, d = f - d, b.x =
              a.x + e * d, b.y = a.y + c * d)
          }
        }
      }
    }
  }
  const Ia = ForceCalculator;
  class DataActionHandler extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      a.Eg(this.qd)
    }
    P(a) {
      a.Da(this.qd.byteLength);
      a.Sf(this.qd)
    }
    W(a) {
      this.qd = a.Nh(a.nb())
    }
  }
  const ka = DataActionHandler;
  class StateQueueManager extends StateManager2 {
    constructor(a) {
      StateManager2.Ja ? super() : (StateManager2.Ja = !0, super(), StateManager2.Ja = !1, this.Aa(a))
    }
    Aa(a) {
      this.nd = this.Ra = 0;
      this.Yd =
        new OrderedList;
      this.Kg = 0;
      this.Ae = .06;
      super.Aa(a)
    }
    rg(a) {
      let b = this.Yd.list,
        c = 0,
        d = b.length,
        e = 0;
      for (; e < a;) {
        for (++e; c < d;) {
          let f = b[c];
          if (f.eb != this.da) break;
          f.apply(this.Fa);
          null != this.yb && this.yb(f);
          this.Ra++;
          ++c
        }
        this.Fa.Ba(1);
        this.nd += this.Ra;
        this.Ra = 0;
        this.da++
      }
      for (; c < d;) {
        a = b[c];
        if (a.eb != this.da || a.fb != this.Ra) break;
        a.apply(this.Fa);
        null != this.yb && this.yb(a);
        this.Ra++;
        ++c
      }
      b.splice(0, c)
    }
    Bf(a) {
      a.eb == this.da && a.fb <= this.Ra ? (a.fb = this.Ra++, a.apply(this.Fa), null != this.yb && this.yb(a)) :
        this.Yd.Di(a)
    }
  }
  const La = StateQueueManager;
  class RtcStateQueueManager extends StateQueueManager {
    constructor(a) {
      StateManager2.Ja = !0;
      super();
      StateManager2.Ja = !1;
      this.Aa(a)
    }
    Aa(a) {
      this.Bc = new Map;
      this.lb = null;
      this.Wc = 32;
      this.wb = new Map; // player id -> player data? Ig = auth, S = playerId,
      this.Ga = [];
      this.Qb = 2;
      this.Bg = 600;
      super.Aa(a.state);
      this.vh = a.Ei;
      this.si = a.version;
      this.wh = 1;
      this.bf = 0;
      this.Kf = performance.now();
      this.Wa = new HaxballRtcSessionManager(this.vh, a.iceServers, kb.channels, a.Gi);
      this.Wa.Ne = getBoundFunction(this, this.Xg);
      let b = this;
      this.Wa.lf = function(c) {
        b.Ah(c)
      };
      this.Wa.Yc = function(c) {
        CallbackHandler.sa(b.Yc, c)
      };
      this.Wa.ic = function(c, d) {
        null != b.ic && b.ic(c, d)
      }
    }
    Mg(a, b, c, d) {
      let e = this.wb.get(a);
      // ActionLog(`e=${e} a=${a} e.jc=${e.jc} e.Ig=${e.Ig} e.S=${e.S}`);
      if (null != e) {
        if (d) {
          let f = this.Wa.vg(e.jc);
          this.Bc.set(a, f)
        }
        a = BufferWriter.aa();
        a.f(5);
        a.f(d ? 1 : 0);
        a.Tb(b);
        null == c && (c = "");
        a.Tb(c);
        e.ob(a);
        e.jc.cb()
      }
    }
    Ed() {
      this.Wa.Ed();
      this.Bc.clear()
    }
    Dd(a) {
      let b = this.Bc.get(a);
      null != b && this.Wa.Dd(b);
      this.Bc.delete(a)
    }
    be(a) {
      this.Wa.be(a)
    }
    ae(a) {
      this.Wa.ae(a)
    }
    nc(a) {
      a.B = 0;
      let b = this.da + this.Qb + this.Kg;
      a.le.delay || (b = this.da);
      a.eb = b;
      this.Bf(a);
      this.$d();
      0 < this.Ga.length && this.hd(this.Od(a), 1)
    }
    Df(a, b) {
      b = this.wb.get(b);
      if (null != b) {
        a.B = 0;
        var c = BufferWriter.aa();
        c.f(6);
        ActionHandler.ue(a, c);
        b.ob(c, 0)
      }
    }
    Ba() {
      let a = ((performance.now() - this.Kf) *
        this.Ae | 0) - this.da;
      0 < a && this.rg(a);
      7 <= this.da - this.cf && this.$d();
      this.da - this.bf >= this.Bg && (this.$d(), this.Wh())
    }
    Xg(a, b) {
      if (this.Ga.length >= this.Wc) return ua.yc(4100);
      try {
        if (b.kc() != this.si) throw r.s(null);
      } catch (c) {
        return ua.yc(4103)
      }
      try {
        let c = b.Ya();
        if (null != this.lb && c != this.lb) throw r.s(null);
      } catch (c) {
        return ua.yc(4101)
      }
      return ua.ze
    }
    Ah(a) {
      if (this.Ga.length >= this.Wc) a.cb();
      else {
        var b = new RequestProcessor(a);
        this.Ga.push(b);
        var c = this;
        a.nf = function(d) {
          c.Jh(d, b)
        };
        a.mf = function() {
          StringHelper2.remove(c.Ga, b);
          c.wb.delete(b.S);
          CallbackHandler.sa(c.zh, b.S)
        };
        a = BufferWriter.aa(1 + b.dc.byteLength);
        a.f(0);
        a.Da(b.dc.byteLength);
        a.pb(b.dc);
        b.ob(a)
      }
    }
    Od(a) {
      let b = BufferWriter.aa();
      b.f(2);
      this.qf(a, b);
      return b
    }
    qf(a, b) {
      b.xa(a.eb);
      b.Da(a.fb);
      b.Oa(a.B);
      b.xa(a.vi);
      ActionHandler.ue(a, b)
    }
    $d() {
      if (!(0 >= this.da - this.cf) && 0 != this.Ga.length) {
        var a = BufferWriter.aa();
        a.f(3);
        a.xa(this.da);
        a.xa(this.nd);
        this.hd(a, 2);
        this.cf = this.da
      }
    }
    hd(a, b) {
      null == b && (b = 0);
      let c = 0,
        d = this.Ga;
      for (; c < d.length;) {
        let e = d[c];
        ++c;
        e.cd && e.ob(a, b)
      }
    }
    $h(a) {
      let b = BufferWriter.aa();
      b.f(1);
      let c = BufferWriter.aa();
      c.Oa(a.S);
      c.xa(this.da);
      c.xa(this.nd);
      c.Da(this.Ra);
      this.Fa.G(c);
      let d = this.Yd.list,
        e = 0,
        f = d.length;
      for (; e < f;) this.qf(d[e++], c);
      b.pb(pako.deflateRaw(c.Bb()));
      a.ob(b)
    }
    Wh() {
      this.bf = this.da;
      if (0 != this.Ga.length) {
        var a = new DataActionHandler;
        a.eb = this.da;
        a.fb = this.Ra++;
        a.B = 0;
        a.qd = this.Fa.Qg();
        this.hd(this.Od(a))
      }
    }
    Lh(a, b) {
      let c = a.La(a.nb()),
        d = a.La(a.nb());
      a = b.dc;
      b.dc = null;
      let e = this;
      SignatureVerifier.verifySignature(c, a).catch(function() {
        return null
      }).then(function(f) {
        try {
          var gaIdx = e.Ga.indexOf(b);
          if (-1 != gaIdx) {
            b.Ig = f;
            var g = e.wh++;
            b.S = g;
            b.real_ip = b.jc.Rb;
            e.wb.set(g, b);
            // ActionLog(`rb=${a.Rb} ig=${b.Ig} S=${b.S} jc=${b.jc.hb} gaIdx=${gaIdx}`);

            CallbackInvoker.sa(e.yh, g, new HaxballDataParser(new DataView(d.buffer, d.byteOffset, d.byteLength),
              !1));
            b.cd = !0;
            e.$h(b)
          }
        } catch (k) {
          f = r.Vb(k).Hb(), e.We(b, f)
        }
      })
    }
    Jh(a, b) {
      this.Ba();
      try {
        let c = new HaxballDataParser(new DataView(a));
        if (!b.Tg.Qf()) throw r.s(1);
        let d = c.C();
        if (b.cd) switch (d) {
            case 1:
              this.Mh(c, b);
              break;
            case 2:
              this.Kh(c, b);
              break;
            default:
              throw r.s(0);
          } else if (0 == d) this.Lh(c, b);
          else throw r.s(0);
        if (0 < c.j.byteLength - c.a) throw r.s(2);
      } catch (c) {
        this.We(b, r.Vb(c).Hb())
      }
    }
    We(a, b) {
      va.console.log(b);
      this.wb.delete(a.S);
      StringHelper2.remove(this.Ga, a);
      a.cd && null != this.kf && this.kf(a.S);
      a.jc.cb()
    }
    Kh(a, b) {
      let c = a.o();
      b.$c = a.nb();
      a =
        BufferWriter.aa();
      a.f(4);
      a.g((performance.now() - this.Kf) * this.Ae + this.Qb);
      a.g(c);
      b.ob(a, 2)
    }
    Mh(a, b) {
      var c = a.Ob();
      let d = a.Ob();
      a = ActionHandler.Hi(a);
      var e = a.le.td;
      if (null != e) {
        var f = b.He.get(e);
        null == f && (f = new RateLimiter(e.pd, e.wd), b.He.set(e, f));
        if (!f.Qf()) throw r.s(3);
      }
      e = this.da + this.Qb;
      f = this.da;
      var g = this.da + 20;
      f = c < f ? f : c > g ? g : c;
      g = c - e;
      if (a.le.delay) {
        if (g < -this.Qb - 3) f = e;
        else {
          let k = -this.Qb,
            l = this.Qb;
          b.hf.qg(g < k ? k : g > l ? l : g)
        }
        f < e && -.85 > b.hf.ug() && (f = e);
        f < b.Jd && (f = b.Jd);
        b.Jd = f
      }
      a.eg = g;
      c = f - c;
      a.fg = 0 < c ? c : 0;
      a.vi = d;
      a.B = b.S;
      a.eb = f;
      a.dg(this.Fa) &&
        (this.Bf(a), this.hd(this.Od(a), 1))
    }
  }
  const Ua = RtcStateQueueManager;
  class StateChangeActionHandler extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      // ActionLog(`StateChangeActionHandler ${this.re}`); // TODO
      let b = a.R(this.B);
      null != b && this.re != b.ne && (b.ne = this.re, CallbackHandler.sa(a.Ki, b))
    }
    P(a) {
      a.f(this.re ? 1 : 0)
    }
    W(a) {
      this.re = 0 != a.C()
    }
  }
  const Ea = StateChangeActionHandler;
  class StyledMessageHandler extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      // ActionLog(`StyledMessageHandler ${this.Pa}`); // TODO
      0 == this.B && HaxballCallbackExecutor.executeCallback(a.Mi, this.Pa, this.color, this.style, this.we)
    }
    P(a) {
      a.Tb(HaxballStringUtils.truncate(this.Pa, 1E3));
      a.w(this.color);
      a.f(this.style);
      a.f(this.we)
    }
    W(a) {
      this.Pa = a.mb();
      if (1E3 < this.Pa.length) throw r.s("message too long");
      this.color = a.H();
      this.style = a.C();
      this.we = a.C()
    }
    static V(a,
      b, c, d) {
      let e = new StyledMessageHandler;
      e.Pa = a;
      e.color = b;
      e.style = c;
      e.we = d;
      return e
    }
  }
  const Y = StyledMessageHandler;
  class ContextualActionHandler extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      if (a.za(this.B)) {
        for (var b = a.R(this.B), c = a.ba, d = [], e = 0, f = 0, g = 0; g < c.length;) {
          let k = c[g];
          ++g;
          k.ja == HaxballActionContext.na && d.push(k);
          k.ja == HaxballActionContext.fa ? ++e : k.ja == HaxballActionContext.ta && ++f
        }
        c = d.length;
        // ActionLog(`ContextualActionHandler ${d}`); // TODO
        0 != c && (f == e ? 2 > c || (a.Hc(b, d[0], HaxballActionContext.fa), a.Hc(b, d[1], HaxballActionContext.ta)) : a.Hc(b, d[0], f > e ? HaxballActionContext.fa : HaxballActionContext
          .ta))
      }
    }
    P() {}
    W() {}
  }
  const Da = ContextualActionHandler;
  class ValueSetterActionHandler extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      if (a.za(this.B) && null == a.D) switch (this.ve) {
        case 0:
          // ActionLog(`ValueSetterActionHandler case0 ${this.newValue}`); // TODO
          var b = this.newValue;
          a.ab = 0 > b ? 0 : 99 < b ? 99 :
            b;
          break;
        case 1:
          // ActionLog(`ValueSetterActionHandler case1 ${this.newValue}`); // TODO
          b = this.newValue, a.Na = 0 > b ? 0 : 99 < b ? 99 : b
      }
    }
    P(a) {
      a.w(this.ve);
      a.w(this.newValue)
    }
    W(a) {
      this.ve = a.H();
      this.newValue = a.H()
    }
    static V(a, b) {
      let c = new ValueSetterActionHandler;
      c.ve = a;
      c.newValue = b;
      return c
    }
  }
  const U = ValueSetterActionHandler;
  class GiveAdminActionHandler extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      if (a.za(this.B)) {
        var b = a.R(this.B),
          c = a.R(this.Fb);
          // ActionLog(`ConditionBasedStateActionHandler ${b} ${c}`); // TODO
        null != c && 0 != c.ma && c.Ub != this.sd && (c.Ub = this.sd, null != a.sf && a.sf(b, c))
      }
    }
    P(a) {
      a.w(this.Fb);
      a.f(this.sd ? 1 : 0)
    }
    W(a) {
      this.Fb = a.H();
      this.sd = 0 != a.C()
    }
    static V(a, b) {
      let c = new GiveAdminActionHandler;
      c.Fb = a;
      c.sd = b;
      return c
    }
  }
  const ba = GiveAdminActionHandler;
  class AvatarUpdaterActionHandler extends ActionHandler {
    // avatar set by player
    constructor() {
      super()
    }
    apply(a) {
      a =
        a.R(this.B);
        // ActionLog(`AvatarUpdaterActionHandler ${a}`); // TODO
      null != a && (a.Db = this.Ea)
    }
    P(a) {
      // if (global.PlayerAvatarOneTime.has(this.B)) this.Ea = null;
      // else {
      //   global.PlayerAvatarOneTime.add(this.B);
      //   ActionLog(`AvatarUpdaterActionHandler one time set for ${this.B} A: ${this.Ea}`);
      // }
      a.Ca(this.Ea)
    }
    W(a) {
      // if (global.PlayerAvatarOneTime.has(this.B)) return;
      this.Ea = a.Ya();
      null != this.Ea && (this.Ea = HaxballStringUtils.truncate(this.Ea, AvatarMaxLength))
    }
  }
  const Fa = AvatarUpdaterActionHandler;
  class GameStartStopSwitcher extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      let b = a.R(this.Fb);
      if (null != b) {
        var c = a.R(this.B),
          d = a.za(this.B);
          // ActionLog(`GameStartStopSwitcher ${this.Fb} ${this.se}`); // TODO
        (d = d || b == c && !a.md && null == a.D) && a.Hc(c, b, this.se)
      }
    }
    P(a) {
      a.w(this.Fb);
      a.f(this.se.S)
    }
    W(a) {
      this.Fb = a.H();
      a = a.Vd();
      this.se = 1 == a ? HaxballActionContext.fa : 2 == a ? HaxballActionContext.ta : HaxballActionContext.na
    }
    static V(a, b) {
      let c = new GameStartStopSwitcher;
      c.Fb = a;
      c.se = b;
      return c
    }
  }
  const aa = GameStartStopSwitcher;
  class MapDataCompressionHandler extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      // console.log(`MapDataCompressionHandler apply`);
      if (a.za(this.B)) {
        var b = a.R(this.B);
        // console.log(`MapDataCompressionHandler apply for ${this.B}`);
        null == a.D && (a.ea = this.vd, null != a.Hf && a.Hf(b, this.vd))
      }
    }
    P(a) {
      var b = BufferWriter.aa();
      this.vd.G(b);
      b = pako.deflateRaw(b.Bb());
      a.Oa(b.byteLength);
      // console.log(`MapDataCompressionHandler deflate raw ${a.byteLength}`);
      a.pb(b)
    }
    W(a) {
      a = pako.inflateRaw(a.La(a.kc()));
      // console.log(`MapDataCompressionHandler inflate raw ${a.byteLength}`);
      this.vd = HaxballMapsManager.pa(new HaxballDataParser(new DataView(a.buffer, a.byteOffset, a.byteLength)))
    }
    static V(a) {
      // console.log("MapDataCompressionHandler static ctor");
      let b = new MapDataCompressionHandler;
      b.vd = a;
      return b
    }
  }
  const V = MapDataCompressionHandler;
  class ActionContextHandler extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      // ActionLog(`ActionContextHandler ${this.ja}`) // TODO
      a.za(this.B) && this.ja != HaxballActionContext.na && (a.sc[this.ja.S] = this.rd)
    }
    P(a) {
      a.f(this.ja.S);
      this.rd.G(a)
    }
    W(a) {
      let b = a.Vd();
      this.ja = 1 == b ? HaxballActionContext.fa : 2 == b ? HaxballActionContext.ta : HaxballActionContext.na;
      this.rd = new X;
      this.rd.pa(a)
    }
  }
  const qa = ActionContextHandler;
  class ValueChangeHandler extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      if (a.za(this.B)) {
        var b = a.md;
        a.md = this.newValue;
        // ActionLog(`ValueChangeHandler ${this.newValue}`); // TODO
        b != this.newValue && CallbackInvoker.sa(a.ii, a.R(this.B), this.newValue)
      }
    }
    P(a) {
      a.f(this.newValue ? 1 : 0)
    }
    W(a) {
      this.newValue = 0 != a.C()
    }
  }
  const pa = ValueChangeHandler;
  class PlayerRegistrationHandler extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      if (0 == this.B) {
        var b = new HaxballPlayerData;
        // ActionLog(`ma=${this.ma} name=${this.name} me=${this.me} Db=${this.Db}`) // TODO
        b.ma = this.ma; // playerId
        b.oa = this.name; // playerName
        b.country = this.me; // country
        b.Db = this.Db; // avatar
        a.ba.push(b);
        a = a.Eh;
        null != a && a(b)
      }
    }
    P(a) {
      a.w(this.ma);
      a.Ca(this.name);
      a.Ca(this.me);
      a.Ca(this.Db)
    }
    W(a) {
      this.ma = a.H();
      this.name = a.Ya();
      this.me = a.Ya();
      this.Db =
        a.Ya()
    }
    static V(a, b, c, d) {
      let e = new PlayerRegistrationHandler;
      e.ma = a;
      e.name = b;
      e.me = c;
      e.Db = d;
      return e
    }
  }
  const Z = PlayerRegistrationHandler;
  class AvatarHandler2 extends ActionHandler {
    // avatar set by server
    constructor() {
      super()
    }
    apply(a) {
      a = a.R(this.sb);
      // ActionLog(`AvatarHandler2 ${this.Ea} ${this.sb}`);// TODO
      null != a && 0 == this.B && (a.Vf = this.Ea)
    }
    P(a) {
      a.Ca(this.Ea); // avatar
      a.w(this.sb) // player id
    }
    W(a) {
      this.Ea = a.Ya();
      this.sb = a.H();
      null != this.Ea && (this.Ea = HaxballStringUtils.truncate(this.Ea, AvatarMaxLength))
    }
    static V(a, b) {
      let c = new AvatarHandler2;
      c.Ea = null != b ? HaxballStringUtils.truncate(b, 2) : null;
      c.sb = a;
      return c
    }
  }
  const fa = AvatarHandler2;
  class MatchFlagToggler extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      let b = a.D;
      if (null != b && a.za(this.B)) {
        var c = a.R(this.B),
          d = 120 == b.Xa,
          e = 0 < b.Xa;
        this.wc ? b.Xa = 120 : 120 ==
          b.Xa && (b.Xa = 119);
          // ActionLog(`MatchFlagToggler ${this.wc}`); // TODO
        d != this.wc && CallbackHandler2.sa(a.Ch, c, this.wc, e)
      }
    }
    P(a) {
      a.f(this.wc ? 1 : 0)
    }
    W(a) {
      this.wc = 0 != a.C()
    }
  }
  const oa = MatchFlagToggler;
  class ChatMessageHandler extends ActionHandler {
    constructor() {
      super()
    }
    dg(a) {
      if (null != a.tf) {
        let b = a.R(this.B);
        return null == b ? !1 : a.tf(b, this.Pa)
      }
      return !0
    }
    apply(a) {
      let b = a.R(this.B);
      // ActionLog(`ChatMessageHandler ${this.Pa}`); // TODO
      null != b && CallbackInvoker.sa(a.Ji, b, this.Pa)
    }
    P(a) {
      a.Tb(HaxballStringUtils.truncate(this.Pa, 140))
    }
    W(a) {
      this.Pa = a.mb();
      if (140 < this.Pa.length) throw r.s("message too long");
    }
  }
  const la = ChatMessageHandler;
  class PlayerInputHandler extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      let b = a.R(this.B);
      if (null === b) return;
      if (this.spec) {
        b.Cb = !1;
        b.Jb = 0;
        null !== a.uf && null !== b.N && a.uf(b, this.input, this.eg, this.fg);
        return;
      }

      // changing here gives only desync!!!
      // console.log(`a=${a} b=${b} aN=${a.noX} bN=${b.noX} auf=${a.uf} bn=${b.N} eg=${this.eg} fg=${this.fg}`);
      // if (global.PlayerNoX.has(this.B)) {
      //   this.input = this.input & 15;
      // }
      var c = this.input;
      // var c = data.keys;
      0 === (b.Jb & 16) && 0 !== (c & 16) &&
        (b.Cb = !0);
      b.Jb = c;

      let data = b.input;
      if (data.no_x) {
        if (data.x) {
          if (!data.x_once) {
            data.x_once = global.CurrentTime - data.x_since > global.TimeoutForX;
          } else {
            data.x_counter++;
            data.x_once = false;
          }
        }
        // ActionLog(`PlayerInputHandler id=${this.B} keys=${data.keys} input=${this.input} x=${data.x} X=${b.Cb}`);
      }

      // ActionLog(`PlayerInputHandler ${this.input}`); // TODO up=1, down=2, left=4, right=8, x=16
      null != a.uf && null != b.N && a.uf(b, this.input, this.eg, this.fg)
      // ActionLog(`PlayerInputHandler I am ${this.B}, eg=${this.eg} fg=${this.fg}`);

      // if (b.ne) { // if desynchronised, kick!
      //   StringHelper2.remove(a.ba, b);
      //   HaxballCallbackExecutor.executeCallback(a.Fh,
      //     b, 'desync', false, null);
      // }
    }
    P(a) {
      // executed only on new user input
      this.spec = global.PlayerIsSpec.has(this.B);
      if (!this.spec) {
        let data = global.PlayerInput.get(this.B);
        if (data.no_x) {
          data.keys = this.input|0;
          if (this.input & 16) {
            if (!data.x) data.x_since = global.CurrentTime;
            data.x = true;
            // ActionLog(`no_x=${data.no_x} x_once=${data.x_once} if(${data.no_x && !data.x_once})`);
            if (data.no_x && !data.x_once) this.input = this.input & 15;
          } else {
            data.x_counter = 0;
            data.x_once = false;
            data.x = false;
          }
        }
      } else if (this.spec) {
        this.input = 0;
      } else if (global.PlayerNoX.has(this.B)) this.input = this.input & 15;
      // ActionLog(`PlayerInputHandler ${this.B} => ${this.input}`); // TODO up=1, down=2, left=4, right=8, x=16
      a.xa(this.input)
    }
    W(a) {
      this.input = a.Ob();
      // ActionLog(`PlayerInputHandler W(a) I am ${this.B}, input: ${this.input},`);
    }
  }
  const Ca = PlayerInputHandler;
  class PlayerStateNotifier extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      let b = a.R(this.B);
      // ActionLog(`PlayerStateNotifier ${this.gg}`); // TODO
      null != b && CallbackInvoker.sa(a.Li, b, this.gg)
    }
    P(a) {
      a.f(this.gg)
    }
    W(a) {
      this.gg = a.C()
    }
  }
  const Ba = PlayerStateNotifier;
  class PlayerRemovalHandler extends ActionHandler {
    constructor() {
      ActionHandler.Ja = !0;
      super();
      ActionHandler.Ja = !1;
      this.Aa()
    }
    Aa() {
      this.od = !1;
      super.Aa()
    }
    apply(a) {
      if (0 != this.ma && a.za(this.B)) {
        var b = a.R(this.ma);
        if (null != b) {
          var c = a.R(this.B);
          StringHelper2.remove(a.ba, b);
          null != a.D && StringHelper2.remove(a.D.ia.A, b.N);
          // ActionLog(`PlayerRemovalHandler MA:${this.ma} RB:${this.rb} OD:${this.od}`); // TODO, playerId, msg, ban
          HaxballCallbackExecutor.executeCallback(a.Fh,
            b, this.rb, this.od, c)
        }
      }
    }
    P(a) {
      null != this.rb && (this.rb = HaxballStringUtils.truncate(this.rb, 100));
      a.w(this.ma);
      a.Ca(this.rb);
      a.f(this.od ? 1 : 0)
    }
    W(a) {
      this.ma = a.H();
      this.rb = a.Ya();
      this.od = 0 != a.C();
      if (null != this.rb && 100 < this.rb.length) throw r.s("string too long");
    }
    static V(a, b, c) {
      let d = new PlayerRemovalHandler;
      d.ma = a;
      d.rb = b;
      d.od = c;
      return d
    }
  }
  const S = PlayerRemovalHandler;
  class PlayerReorderHandler extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      if (0 == this.B) {
        // ActionLog(`PlayerReorderHandler`); // TODO
        for (var b = new Map, c = 0, d = a.ba; c < d.length;) {
          var e = d[c];
          ++c;
          b.set(e.ma, e)
        }
        c = [];
        d = 0;
        for (e = this.vc; d < e.length;) {
          var f = e[d];
          ++d;
          let g = b.get(f);
          null != g &&
            (b.delete(f), c.push(g))
        }
        d = [];
        b = b.values();
        for (e = b.next(); !e.done;) f = e.value, e = b.next(), d.push(f);
        a.ba = this.te ? c.concat(d) : d.concat(c)
      }
    }
    P(a) {
      a.f(this.te ? 1 : 0);
      a.f(this.vc.length);
      let b = 0,
        c = this.vc;
      for (; b < c.length;) a.w(c[b++])
    }
    W(a) {
      this.te = 0 != a.C();
      let b = a.C();
      this.vc = [];
      let c = 0;
      for (; c < b;) ++c, this.vc.push(a.H())
    }
    static V(a, b) {
      let c = new PlayerReorderHandler;
      for (var d = new Set, e = 0; e < a.length;) d.add(a[e++]);
      a = [];
      e = 0;
      d = d.values();
      let f = d.next();
      for (; !f.done;) {
        let g = f.value;
        f = d.next();
        a.push(g);
        ++e;
        if (40 <= e) break
      }
      c.vc = a;
      c.te =
        b;
      return c
    }
  }
  const da = PlayerReorderHandler;
  class PhysicsUpdateHandler extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      if (0 == this.B) {
        // ActionLog(`PhysicsUpdateHandler`); // TODO
        var b = a.D;
        if (null != b) {
          if (this.pe) {
            a = a.R(this.sb);
            if (null == a) return;
            a = a.N
          } else a = b.ia.A[this.sb];
          null != a && (null != this.O[0] && (a.a.x = this.O[0]), null != this.O[1] && (a.a.y = this.O[1]), null !=
            this.O[2] && (a.u.x = this.O[2]), null != this.O[3] && (a.u.y = this.O[3]), null != this.O[4] && (a.la
              .x = this.O[4]), null != this.O[5] && (a.la.y = this.O[5]), null != this.O[6] && (a.M = this.O[6]),
            null != this.O[7] && (a.i = this.O[7]), null != this.O[8] && (a.L = this.O[8]), null != this.O[9] &&
            (a.ga = this.O[9]), null != this.ya[0] && (a.T = this.ya[0]), null != this.ya[1] && (a.c = this.ya[
            1]), null != this.ya[2] && (a.m = this.ya[2]))
        }
      }
    }
    P(a) {
      a.w(this.sb);
      a.f(this.pe ? 1 : 0);
      let b = a.a;
      a.Oa(0);
      let c = 0;
      for (var d = 1, e = 0, f = this.O; e < f.length;) {
        var g = f[e];
        ++e;
        null != g && (c |= d, a.ge(g));
        d <<= 1
      }
      e = 0;
      for (f = this.ya; e < f.length;) g = f[e], ++e, null != g && (c |= d, a.w(g)), d <<= 1;
      d = a.a;
      a.a = b;
      a.Oa(c);
      a.a = d
    }
    W(a) {
      this.sb = a.H();
      this.pe = 0 != a.C();
      let b = a.kc();
      this.O = [];
      for (var c = 0; 10 > c;) {
        var d = c++;
        this.O[d] = null;
        0 != (b & 1) && (this.O[d] = a.Oh());
        b >>>=
          1
      }
      this.ya = [];
      for (c = 0; 3 > c;) d = c++, this.ya[d] = null, 0 != (b & 1) && (this.ya[d] = a.H()), b >>>= 1
    }
    static ag(a, b, c) {
      let d = new PhysicsUpdateHandler;
      d.sb = a;
      d.pe = b;
      d.O = [c.x, c.y, c.xspeed, c.yspeed, c.xgravity, c.ygravity, c.radius, c.bCoeff, c.invMass, c.damping];
      d.ya = [c.color, c.cMask, c.cGroup];
      a = 0;
      for (b = d.O.length; a < b;) {
        c = a++;
        var e = d.O[c];
        null != e && (PhysicsUpdateHandler.Xf[0] = e, d.O[c] = PhysicsUpdateHandler.Xf[0])
      }
      a = 0;
      for (b = d.ya.length; a < b;) c = a++, e = d.ya[c], null != e && (PhysicsUpdateHandler.$f[0] = e, d.ya[c] = PhysicsUpdateHandler.$f[0]);
      return d
    }
  }
  const M = PhysicsUpdateHandler;
  class RateAdjuster extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      // ActionLog(`RateAdjuster kick rate`); // TODO
      a.za(this.B) && a.ai(a.R(this.B),
        this.min, this.rate, this.ke)
    }
    P(a) {
      a.w(this.min);
      a.w(this.rate);
      a.w(this.ke)
    }
    W(a) {
      this.min = a.H();
      this.rate = a.H();
      this.ke = a.H()
    }
    static V(a, b, c) {
      let d = new RateAdjuster;
      d.min = a;
      d.rate = b;
      d.ke = c;
      return d
    }
  }
  const ea = RateAdjuster;
  class SomeSmallActionHandler extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      // ActionLog(`SomeSmallActionHandler`); // TODO
      a.za(this.B) && a.ei(a.R(this.B))
    }
    P() {}
    W() {}
  }
  const ma = SomeSmallActionHandler;
  class CleanupActionHandler extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      if (a.za(this.B)) {
        // ActionLog(`CleanupActionHandler`); // TODO
        var b = a.R(this.B);
        if (null != a.D) {
          a.D = null;
          let c = 0,
            d = a.ba;
          for (; c < d.length;) {
            let e = d[c];
            ++c;
            e.N = null;
            e.Eb = 0
          }
          null != a.ld && a.ld(b)
        }
      }
    }
    P() {}
    W() {}
  }
  const na = CleanupActionHandler;
  class CollectionSynchronizer extends ActionHandler {
    constructor() {
      super()
    }
    apply(a) {
      if (0 ==
        this.B) {
          // ActionLog(`CollectionSynchronizer ${this.Xb}`); // TODO
        a = a.ba;
        for (var b = 0, c = a.length; b < c;) {
          let d = b++;
          if (d >= this.Xb.length) break;
          a[d].$c = this.Xb[d]
        }
      }
    }
    P(a) {
      a.Da(this.Xb.length);
      let b = 0,
        c = this.Xb;
      for (; b < c.length;) a.Da(c[b++])
    }
    W(a) {
      this.Xb = [];
      let b = a.nb(),
        c = 0;
      for (; c < b;) ++c, this.Xb.push(a.nb())
    }
    static V(a) {
      let b = new CollectionSynchronizer,
        c = a.Fa.ba,
        d = [],
        e = 0;
      for (; e < c.length;) {
        let f = a.wb.get(c[e++].ma);
        d.push(null == f ? 0 : f.$c)
      }
      b.Xb = d;
      return b
    }
  }
  const ca = CollectionSynchronizer;
  class r extends Error {
    constructor(a, b, c) {
      super(a);
      this.message = a;
      this.Fe = null != c ? c : this
    }
    Hb() {
      return this.Fe
    }
    toString() {
      return this.message
    }
    static Vb(a) {
      return a instanceof
      r ? a : a instanceof Error ? new r(a.message, null, a) : new Ma(a, null, a)
    }
    static s(a) {
      return a instanceof r ? a.Fe : a instanceof Error ? a : new Ma(a)
    }
  }
  class Ma extends r {
    constructor(a, b, c) {
      super(String(a), b, c);
      this.value = a
    }
    Hb() {
      return this.value
    }
  }
  var Xa = Xa || {},
    gb;
  StringHelper2.b = !0;
  Math.b = !0;
  ObjectPropertyFilter.b = !0;
  HaxballUtils.b = !0;
  HexConverter.b = !0;
  HaxballStringUtils.b = !0;
  mb.b = !0;
  mb.yd = !0;
  RtcConnectionHandler.b = !0;
  RtcConnectionHandler.gb = [mb];
  Object.assign(RtcConnectionHandler.prototype, {
    h: RtcConnectionHandler
  });
  var ua = Xa["bas.basnet.ConnectionRequestResponse"] = {
    Ce: !0,
    Be: null,
    ze: {
      Xe: "Accept",
      Kd: 0,
      Yb: "bas.basnet.ConnectionRequestResponse",
      toString: toStringSafe
    },
    yc: (gb = function(a) {
      return {
        Kd: 1,
        reason: a,
        Yb: "bas.basnet.ConnectionRequestResponse",
        toString: toStringSafe
      }
    }, gb.Xe = "Reject", gb.Ge = ["reason"], gb)
  };
  ua.Be = [ua.ze, ua.yc];
  HaxballRtcSessionManager.b = !0;
  Object.assign(HaxballRtcSessionManager.prototype, {
    h: HaxballRtcSessionManager
  });
  HaxballParser.b = !0;
  WebSocketConnection.b = !0;
  Object.assign(WebSocketConnection.prototype, {
    h: WebSocketConnection
  });
  HaxballDataParser.b = !0;
  Object.assign(HaxballDataParser.prototype, {
    h: HaxballDataParser
  });
  BufferWriter.b = !0;
  Object.assign(BufferWriter.prototype, {
    h: BufferWriter
  });
  SignatureVerifier.b = !0;
  RecaptchaLoader.b = !0;
  PromiseTimeout.b = !0;
  ActionHandler.b = !0;
  Object.assign(ActionHandler.prototype, {
    h: ActionHandler
  });
  OrderedList.b = !0;
  Object.assign(OrderedList.prototype, {
    h: OrderedList
  });
  StateManager2.b = !0;
  Object.assign(StateManager2.prototype, {
    h: StateManager2
  });
  DataActionHandler.b = !0;
  DataActionHandler.J = ActionHandler;
  Object.assign(DataActionHandler.prototype, {
    h: DataActionHandler
  });
  Va.b = !0;
  Va.yd = !0;
  Object.assign(Va.prototype, {
    h: Va
  });
  DataCompressor.b = !0;
  Object.assign(DataCompressor.prototype, {
    h: DataCompressor
  });
  W.b = !0;
  W.yd = !0;
  StateQueueManager.b = !0;
  StateQueueManager.J = StateManager2;
  Object.assign(StateQueueManager.prototype, {
    h: StateQueueManager
  });
  RtcStateQueueManager.b = !0;
  RtcStateQueueManager.J = StateQueueManager;
  Object.assign(RtcStateQueueManager.prototype, {
    h: RtcStateQueueManager
  });
  RequestProcessor.b = !0;
  Object.assign(RequestProcessor.prototype, {
    h: RequestProcessor
  });
  CircularBuffer.b = !0;
  Object.assign(CircularBuffer.prototype, {
    h: CircularBuffer
  });
  kb.b = !0;
  OtherPoint2D.b = !0;
  Object.assign(OtherPoint2D.prototype, {
    h: OtherPoint2D
  });
  Point2D.b = !0;
  Object.assign(Point2D.prototype, {
    h: Point2D
  });
  HaxballHttpRequest.b = !0;
  CallbackHandler.b = !0;
  CallbackInvoker.b = !0;
  CallbackHandler2.b = !0;
  HaxballCallbackExecutor.b = !0;
  RateLimiter.b = !0;
  Object.assign(RateLimiter.prototype, {
    h: RateLimiter
  });
  HaxballGeoLocation.b = !0;
  Object.assign(HaxballGeoLocation.prototype, {
    h: HaxballGeoLocation
  });
  wa.b = !0;
  HaxballApiManager.b = !0;
  HaxballShortPlayerData.b = !0;
  Object.assign(HaxballShortPlayerData.prototype, {
    h: HaxballShortPlayerData
  });
  HaxballPhysicalEntity.b = !0;
  Object.assign(HaxballPhysicalEntity.prototype, {
    h: HaxballPhysicalEntity
  });
  HaxballPhysicsSimulator.b = !0;
  HaxballPhysicsSimulator.gb = [W];
  Object.assign(HaxballPhysicsSimulator.prototype, {
    h: HaxballPhysicsSimulator
  });
  PlayerPosition.b = !0;
  Object.assign(PlayerPosition.prototype, {
    h: PlayerPosition
  });
  Ta.b = !0;
  Object.assign(Ta.prototype, {
    h: Ta
  });
  EmptyClass.b = !0;
  Object.assign(EmptyClass.prototype, {
    h: EmptyClass
  });
  HaxballMapsManager.b = !0;
  Object.assign(HaxballMapsManager.prototype, {
    h: HaxballMapsManager
  });
  X.b = !0;
  Object.assign(X.prototype, {
    h: X
  });
  HaxballActionContext.b = !0;
  Object.assign(HaxballActionContext.prototype, {
    h: HaxballActionContext
  });
  HaxballPlayerManager.b = !0;
  HaxballPlayerManager.gb = [W, Va];
  Object.assign(HaxballPlayerManager.prototype, {
    h: HaxballPlayerManager
  });
  HaxballPlayerData.b = !0;
  HaxballPlayerData.gb = [W];
  Object.assign(HaxballPlayerData.prototype, {
    h: HaxballPlayerData
  });
  StateChangeActionHandler.b = !0;
  StateChangeActionHandler.J = ActionHandler;
  Object.assign(StateChangeActionHandler.prototype, {
    h: StateChangeActionHandler
  });
  StyledMessageHandler.b = !0;
  StyledMessageHandler.J = ActionHandler;
  Object.assign(StyledMessageHandler.prototype, {
    h: StyledMessageHandler
  });
  ContextualActionHandler.b = !0;
  ContextualActionHandler.J = ActionHandler;
  Object.assign(ContextualActionHandler.prototype, {
    h: ContextualActionHandler
  });
  ValueSetterActionHandler.b = !0;
  ValueSetterActionHandler.J = ActionHandler;
  Object.assign(ValueSetterActionHandler.prototype, {
    h: ValueSetterActionHandler
  });
  GiveAdminActionHandler.b = !0;
  GiveAdminActionHandler.J = ActionHandler;
  Object.assign(GiveAdminActionHandler.prototype, {
    h: GiveAdminActionHandler
  });
  AvatarUpdaterActionHandler.b = !0;
  AvatarUpdaterActionHandler.J = ActionHandler;
  Object.assign(AvatarUpdaterActionHandler.prototype, {
    h: AvatarUpdaterActionHandler
  });
  GameStartStopSwitcher.b = !0;
  GameStartStopSwitcher.J = ActionHandler;
  Object.assign(GameStartStopSwitcher.prototype, {
    h: GameStartStopSwitcher
  });
  MapDataCompressionHandler.b = !0;
  MapDataCompressionHandler.J = ActionHandler;
  Object.assign(MapDataCompressionHandler.prototype, {
    h: MapDataCompressionHandler
  });
  ActionContextHandler.b = !0;
  ActionContextHandler.J = ActionHandler;
  Object.assign(ActionContextHandler.prototype, {
    h: ActionContextHandler
  });
  ValueChangeHandler.b = !0;
  ValueChangeHandler.J = ActionHandler;
  Object.assign(ValueChangeHandler.prototype, {
    h: ValueChangeHandler
  });
  PlayerRegistrationHandler.b = !0;
  PlayerRegistrationHandler.J = ActionHandler;
  Object.assign(PlayerRegistrationHandler.prototype, {
    h: PlayerRegistrationHandler
  });
  AvatarHandler2.b = !0;
  AvatarHandler2.J = ActionHandler;
  Object.assign(AvatarHandler2.prototype, {
    h: AvatarHandler2
  });
  MatchFlagToggler.b = !0;
  MatchFlagToggler.J = ActionHandler;
  Object.assign(MatchFlagToggler.prototype, {
    h: MatchFlagToggler
  });
  ChatMessageHandler.b = !0;
  ChatMessageHandler.J = ActionHandler;
  Object.assign(ChatMessageHandler.prototype, {
    h: ChatMessageHandler
  });
  PlayerInputHandler.b = !0;
  PlayerInputHandler.J = ActionHandler;
  Object.assign(PlayerInputHandler.prototype, {
    h: PlayerInputHandler
  });
  PlayerStateNotifier.b = !0;
  PlayerStateNotifier.J = ActionHandler;
  Object.assign(PlayerStateNotifier.prototype, {
    h: PlayerStateNotifier
  });
  rb.b = !0;
  PlayerRemovalHandler.b = !0;
  PlayerRemovalHandler.J = ActionHandler;
  Object.assign(PlayerRemovalHandler.prototype, {
    h: PlayerRemovalHandler
  });
  PlayerReorderHandler.b = !0;
  PlayerReorderHandler.J = ActionHandler;
  Object.assign(PlayerReorderHandler.prototype, {
    h: PlayerReorderHandler
  });
  PhysicsUpdateHandler.b = !0;
  PhysicsUpdateHandler.J = ActionHandler;
  Object.assign(PhysicsUpdateHandler.prototype, {
    h: PhysicsUpdateHandler
  });
  RateAdjuster.b = !0;
  RateAdjuster.J = ActionHandler;
  Object.assign(RateAdjuster.prototype, {
    h: RateAdjuster
  });
  SomeSmallActionHandler.b = !0;
  SomeSmallActionHandler.J =
    ActionHandler;
  Object.assign(SomeSmallActionHandler.prototype, {
    h: SomeSmallActionHandler
  });
  CleanupActionHandler.b = !0;
  CleanupActionHandler.J = ActionHandler;
  Object.assign(CleanupActionHandler.prototype, {
    h: CleanupActionHandler
  });
  CollectionSynchronizer.b = !0;
  CollectionSynchronizer.J = ActionHandler;
  Object.assign(CollectionSynchronizer.prototype, {
    h: CollectionSynchronizer
  });
  PhysicsObject.b = !0;
  PhysicsObject.gb = [W];
  Object.assign(PhysicsObject.prototype, {
    h: PhysicsObject
  });
  ForceCalculator.b = !0;
  ForceCalculator.gb = [W];
  Object.assign(ForceCalculator.prototype, {
    h: ForceCalculator
  });
  SomeInteractionManager.b = !0;
  SomeInteractionManager.gb = [W];
  Object.assign(SomeInteractionManager.prototype, {
    h: SomeInteractionManager
  });
  K.b = !0;
  Object.assign(K.prototype, {
    h: K
  });
  VectorCalculation.b = !0;
  Object.assign(VectorCalculation.prototype, {
    h: VectorCalculation
  });
  DataContainer.b = !0;
  Object.assign(DataContainer.prototype, {
    h: DataContainer
  });
  r.b = !0;
  r.J = Error;
  Object.assign(r.prototype, {
    h: r
  });
  Ma.b = !0;
  Ma.J = r;
  Object.assign(Ma.prototype, {
    h: Ma
  });
  SequenceInArrayIterator.b = !0;
  Object.assign(SequenceInArrayIterator.prototype, {
    h: SequenceInArrayIterator
  });
  HaxballTypeHelper.b = !0;
  va.ye |= 0;
  "undefined" != typeof performance && "function" == typeof performance.now && (StringHelper2.now = performance.now.bind(
    performance));
  null == String.fromCodePoint && (String.fromCodePoint = function(a) {
    return 65536 > a ? String.fromCharCode(a) : String.fromCharCode((a >> 10) + 55232) + String.fromCharCode((a &
      1023) + 56320)
  });
  Object.defineProperty(String.prototype, "__class__", {
    value: String,
    enumerable: !1,
    writable: !0
  });
  String.b = !0;
  Array.b = !0;
  var za = {},
    vb = {},
    z = Number,
    Ya = Boolean,
    wb = {},
    xb = {};
  HaxballActionContext.na = new HaxballActionContext(0, 16777215, 0, -1, "Spectators", "t-spec", 0, 0);
  HaxballActionContext.fa = new HaxballActionContext(1, 15035990, -1, 8, "Red", "t-red", 15035990, 2);
  HaxballActionContext.ta = new HaxballActionContext(2, 5671397, 1, 16, "Blue", "t-blue", 625603, 4);
  HaxballActionContext.na.Zc = HaxballActionContext.na;
  HaxballActionContext.fa.Zc = HaxballActionContext.ta;
  HaxballActionContext.ta.Zc = HaxballActionContext.fa;
  HaxballTypeHelper.pg = {}.toString;
  RtcConnectionHandler.Fg = {
    mandatory: {
      OfferToReceiveAudio: !1,
      OfferToReceiveVideo: !1
    }
  };
  SignatureVerifier.sg = {
    name: "ECDSA",
    namedCurve: "P-256"
  };
  SignatureVerifier.ci = {
    name: "ECDSA",
    hash: {
      name: "SHA-256"
    }
  };
  ActionHandler.Ja = !1;
  ActionHandler.Zf = new Map;
  ActionHandler.je = 0;
  StateManager2.Ja = !1;
  DataActionHandler.U = ActionHandler.Z({
    ca: !1,
    delay: !1
  });
  kb.channels = [{
    name: "ro",
    reliable: !0,
    ordered: !0
  }, {
    name: "ru",
    reliable: !0,
    ordered: !1
  }, {
    name: "uu",
    reliable: !1,
    ordered: !1
  }];
  HaxballHttpRequest.hg = "application/x-www-form-urlencoded";
  wa.Ke = "https://www.haxball.com/rs/";
  wa.Md = [{
    urls: "stun:stun.l.google.com:19302"
  }];
  HaxballApiManager.Se = new HaxballGeoLocation;
  HaxballApiManager.Ff = !1;
  HaxballPhysicsSimulator.jf = function() {
    let a = [];
    {
      let b = 0;
      for (; 256 > b;) ++b, a.push(new Point2D(0, 0))
    }
    return a
  }(this);
  HaxballPhysicsSimulator.Re = function() {
    let a = [];
    {
      let b = 0;
      for (; 256 > b;) ++b, a.push(0)
    }
    return a
  }(this);
  StateChangeActionHandler.U = ActionHandler.Z({
    ca: !1,
    delay: !1,
    td: {
      pd: 2,
      wd: 1E4
    }
  });
  StyledMessageHandler.U = ActionHandler.Z({
    ca: !1,
    delay: !1,
    td: {
      pd: 10,
      wd: 900
    }
  });
  ContextualActionHandler.U = ActionHandler.Z({
    ca: !1,
    delay: !1
  });
  ValueSetterActionHandler.U = ActionHandler.Z({
    ca: !1,
    delay: !1
  });
  GiveAdminActionHandler.U = ActionHandler.Z({
    ca: !1,
    delay: !1
  });
  AvatarUpdaterActionHandler.U = ActionHandler.Z({
    ca: !1,
    delay: !1
  });
  GameStartStopSwitcher.U = ActionHandler.Z({
    ca: !1,
    delay: !1
  });
  MapDataCompressionHandler.U = ActionHandler.Z({
    ca: !1,
    delay: !1,
    td: {
      pd: 10,
      wd: 2E3
    }
  });
  ActionContextHandler.U = ActionHandler.Z({
    ca: !1,
    delay: !1
  });
  ValueChangeHandler.U = ActionHandler.Z({
    ca: !1,
    delay: !1
  });
  PlayerRegistrationHandler.U = ActionHandler.Z({
    ca: !1,
    delay: !1
  });
  AvatarHandler2.U = ActionHandler.Z({
    ca: !1,
    delay: !1
  });
  MatchFlagToggler.U = ActionHandler.Z({});
  ChatMessageHandler.U = ActionHandler.Z({
    ca: !1,
    delay: !1,
    td: {
      pd: 10,
      wd: 900
    }
  });
  PlayerInputHandler.U = ActionHandler.Z({});
  PlayerStateNotifier.U = ActionHandler.Z({
    ca: !1,
    delay: !1
  });
  PlayerRemovalHandler.U = ActionHandler.Z({
    ca: !1,
    delay: !1
  });
  PlayerReorderHandler.U = ActionHandler.Z({
    ca: !1,
    delay: !1
  });
  PhysicsUpdateHandler.U = ActionHandler.Z({
    ca: !1,
    delay: !1
  });
  PhysicsUpdateHandler.Xf = new Float32Array(1);
  PhysicsUpdateHandler.$f = new Int32Array(1);
  RateAdjuster.U = ActionHandler.Z({
    ca: !1,
    delay: !1
  });
  SomeSmallActionHandler.U = ActionHandler.Z({
    ca: !1,
    delay: !1
  });
  CleanupActionHandler.U = ActionHandler.Z({
    ca: !1,
    delay: !1
  });
  CollectionSynchronizer.U = ActionHandler.Z({
    ca: !1,
    delay: !1
  });
  VectorCalculation.jg = .17435839227423353;
  VectorCalculation.ig = 5.934119456780721;
  HaxballApiManager.sh()
})("undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof self ? self :
  this);

module.exports = HBLoaded;