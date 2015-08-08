'use strict';

const STORAGE_ROOT = 'myfeeds.session.';

export class Session {

  constructor() {
    this._data = {};
    for (let fqKey in localStorage) {
      if (fqKey.startsWith(STORAGE_ROOT)) {
        const key = fqKey.substr(STORAGE_ROOT.length);
        const val = JSON.parse(localStorage[fqKey]);
        this._data[key] = val;
      }
    }
  }

  get(key) {
    return this._data[key];
  }

  set(data) {
    for (let key in data) {
      const val = data[key];
      this._data[key] = val;
      localStorage[this._fqKey(key)] = JSON.stringify(val);
    }
  }

  remove(key) {
    delete this._data[key];
    delete localStorage[this._fqKey(key)];
  }

  clear() {
    for (let [key] of Array.from(this)) {
      this.remove(key);
    }
  }

  *[Symbol.iterator]() {
    for (let key of this._data) {
      const val = this._data[key];
      yield [key, val];
    }
  }

  _fqKey(key) {
    return STORAGE_ROOT + key;
  }
}

export default new Session();

