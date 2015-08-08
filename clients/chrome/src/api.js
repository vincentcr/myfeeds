'use strict';

import Bluebird from 'bluebird';
import _ from 'lodash';
import Session from './session';

const API_BASE_URL = 'http://localhost:3000/api/v1';
const MIME_JSON = 'application/json';
const REQUEST_DEFAULTS = Object.freeze({
  method: 'GET',
  headers: {
    'accept': MIME_JSON,
    'content-type': MIME_JSON,
  },
});

export class Api {

  post(req) {
    req.method = 'POST';
    return this.send(req);
  }

  get(req) {
    req.method = 'GET';
    return this.send(req);
  }

  put(req) {
    req.method = 'PUT';
    return this.send(req);
  }

  delete(req) {
    req.method = 'DELETE';
    return this.send(req);
  }

  send(req) {
    this._authorize(req);
    if (typeof req === 'string') {
      req = { url: req };
    }

    if(!/^https?:/.test(req.url)) {
      req.url = API_BASE_URL + req.url;
    }

    return this._exec(req);
    // .catch((err) => {
    //   console.log(err, req);
    // });
  }

  _authorize(req) {
    if (req.auth != null) {
      this._authorizeWith(req, req.auth);
    } else {
      const token = Session.get('token');
      if (token != null) {
        this._authorizeWith(req, {scheme: 'token', creds: token});
      }
    }
  }

  _authorizeWith(req, {scheme, creds}) {
    if (req.headers == null) {
      req.headers = {};
    }
    if (req.headers.authorization == null) {
      if (scheme === 'token') {
        req.headers.authorization = `Token token="${creds}"`;
      } else if (scheme === 'basic') {
        const encoded = btoa(creds.email + ':' + creds.password);
        req.headers.authorization = `Basic ${encoded}`;
      }
    }
  }

  _exec(req) {
    const promise = new Bluebird(function (resolve, reject) {
      req = _.merge({}, REQUEST_DEFAULTS, req);

      const xhr = new XMLHttpRequest();
      xhr.open(req.method, req.url);

      Object.keys(req.headers).forEach(function(name){
        const val = req.headers[name];
        xhr.setRequestHeader(name, val);
      });

      if (isJSON(req.headers['content-type']) && typeof req.data === 'object') {
        req.data = JSON.stringify(req.data);
      }

      xhr.addEventListener('error', reject);
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let data;
          if (isJSON(xhr.getResponseHeader('content-type'))) {
            data = JSON.parse(xhr.responseText);
          } else {
            data = xhr.responseText;
          }
          resolve(data, xhr);
        } else {
          reject(xhr);
        }
      });


      xhr.send(req.data);
    });
    return promise;
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
    return this._api.post({
      url: '/users',
      auth: {
        scheme: 'basic',
        creds: creds,
      },
    })
    .then( (res) => Session.set(res) )
    ;
  },

  signin(creds) {
    return this._api.post({
      url: '/users/tokens',
      auth: {
        scheme: 'basic',
        creds: creds,
      },
    })
    .then( (res) => {
      console.log('yyyyyy');
      Session.set(res);
      return res;
    })
    ;
  },

  signout() {
    if (this._api.token != null) {
      return this.delete(`/users/tokens/${this.token}`)
      .finally(() => {
        Session.clear();
      });
    } else {
      return Bluebird.reject(new Error('not signed in'));
    }
  },

});

export const Feeds = Api.create({

  getAll() {
    return this._api.get('/feeds');
  },

  get(feedID) {
    return this._api.get(`/feeds/${feedID}`);
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

    return this._api.send({url: url, method: method, data: feed});
  },

  remove(feedID) {
    return this._api.delete(`/feeds/${feedID}`);
  },

  addItem(feedID, item) {
    const url = `/feeds/${feedID}/items`;
    return this._api.put({url: url, data: item});
  },

});


