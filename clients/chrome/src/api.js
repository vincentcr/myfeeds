import Session from './session';
import 'whatwg-fetch';

const API_BASE_URL = 'http://localhost:3000/api/v1';
const MIME_JSON = 'application/json';
const DEFAULT_HEADERS = Object.freeze({
  'accept': MIME_JSON,
  'content-type': MIME_JSON,
});

export class Api {

  get(url, opts) {
    return this.send(url, {...opts, method: 'GET'});
  }

  post(url, opts) {
    return this.send(url, {...opts, method: 'POST'});
  }

  put(url, opts) {
    return this.send(url, {...opts, method: 'PUT'});
  }

  delete(url, opts) {
    return this.send(url, {...opts, method: 'DELETE'});
  }

  send(url, opts) {
    url = this._normalizeUrl(url);
    this._completeHeaders(opts);
    this._encodeBody(opts);
    const res = this._exec(url, opts);
    return res;
  }

  _normalizeUrl(url) {
    if(!/^https?:/.test(url)) {
      return API_BASE_URL + url;
    } else {
      return url;
    }
  }

  _completeHeaders(opts) {
    if (opts.headers == null) {
      opts.headers = {};
    }
    opts.headers = Object.assign({}, DEFAULT_HEADERS, opts.headers);
    this._authorize(opts);
  }

  _authorize(opts) {
    if (opts.auth != null) {
      this._authorizeWith(opts, opts.auth);
    } else {
      const token = Session.get('token');
      if (token != null) {
        this._authorizeWith(opts, {scheme: 'token', creds: token});
      }
    }

    delete opts.auth;
  }

  _authorizeWith(opts, {scheme, creds}) {
    if (opts.headers.authorization == null) {
      if (scheme === 'token') {
        opts.headers.authorization = `Token token="${creds}"`;
      } else if (scheme === 'basic') {
        const encoded = btoa(creds.email + ':' + creds.password);
        opts.headers.authorization = `Basic ${encoded}`;
      }
    }
  }

  _encodeBody(opts) {
    if (isJSON(opts.headers['content-type']) && typeof opts.data === 'object' && opts.body == null) {
      opts.body = JSON.stringify(opts.data);
      delete opts.data;
    }
  }

  _exec(url, opts) {
    return fetch(url, opts).then((res) => {
        const status = res.status;
        if (status >= 400) {
          const err = Object.assign(new Error(`Unexpected status ${res.status}`), {res, status});
          throw err;
        } else {
          return res;
        }
      })
      .catch((err) => {
        if (err.status === 401) {
          Session.clear();
        }
        console.log('request failed', err, {url, opts});
        throw err;
      });
  }
}

Api.create = function(routes) {
  routes._api = new Api();
  return routes;
};



function isJSON(contentType) {
  if (contentType) {
    const mime = /^(.+?)(\;.*)?$/.exec(contentType)[1];
    return MIME_JSON === mime;
  }
}


export const Users = Api.create({
  signup(creds) {
    return this._api.post('/users', {
      auth: {
        scheme: 'basic',
        creds: creds,
      },
    })
    .then(res => res.json())
    .then(userData => Session.set(userData))
    ;
  },

  signin(creds) {
    return this._api.post('/users/tokens', {
      auth: {
        scheme: 'basic',
        creds: creds,
      },
    })
    .then(res => res.json())
    .then(userData => Session.set(userData))
    ;
  },

  signout() {
    if (this._api.token != null) {
      return this.delete(`/users/tokens/${this.token}`)
      .finally(() => {
        Session.clear();
      });
    } else {
      return Promise.reject(new Error('not signed in'));
    }
  },

});

export const Feeds = Api.create({

  getAll() {
    return this._api.get('/feeds').then(res => res.json());
  },

  get(feedID) {
    return this._api.get(`/feeds/${feedID}`).then(res => res.json());
  },

  save(feed) {
    let method, url;
    if (feed.id == null) {
      method = 'POST';
      url = '/feeds';
    } else {
      method = 'PUT';
      url = `/feeds/${feed.id}`;
    }

    return this._api
      .send(url, {method, data: feed})
      .then(res => {
        console.log(res)
        return res
      })
      .then(res => res.json())
      .then((savedFeed) => {
        return savedFeed || feed;
      })
    ;
  },

  remove(feedID) {
    return this._api.delete(`/feeds/${feedID}`);
  },

  addItem(feedID, item) {
    const url = `/feeds/${feedID}/items`;
    return this._api.put(url, {data: item});
  },

});
