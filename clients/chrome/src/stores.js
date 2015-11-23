import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunkMiddleware from 'redux-thunk';
import createLoggerMiddleware from 'redux-logger';

export const ASYNC_BEGIN = 'ASYNC_BEGIN';
export const ASYNC_COMPLETE = 'ASYNC_COMPLETE';

export const FEEDS_FETCH_INVALIDATE = 'FEEDS_FETCH_INVALIDATE';
export const FEEDS_FETCH_COMPLETE = 'FEEDS_FETCH_COMPLETE';
export const FEEDS_UPDATE = 'FEEDS_UPDATE';
export const FEEDS_DELETE = 'FEEDS_DELETE';

export const FEED_CREATE = 'FEED_CREATE';
export const FEED_SELECT = 'FEED_SELECT';
export const FEED_DESELECT = 'FEED_DESELECT';
export const FEED_ADD = 'FEED_ADD';
export const FEED_REMOVE = 'FEED_REMOVE';
export const FEED_UPDATE = 'FEED_UPDATE';
export const FEED_ITEM_ADD = 'FEED_ITEM_ADD';
export const FEED_ITEM_UPDATE = 'FEED_ITEM_UPDATE';
export const FEED_ITEM_INSERT = 'FEED_ITEM_INSERT';
export const FEED_ITEM_DELETE = 'FEED_ITEM_DELETE';

const INITIAL_STATE = Object.freeze({
  asyncState: {
    inProgress:false,
  },
  feedList: {
    didInvalidate: true,
    feeds: {},
  },
  feed: {
    current: null,
    isEditing: false,
  },
});

function asyncState(state = INITIAL_STATE.asyncState, action) {
  switch (action.type) {
    case ASYNC_BEGIN:
      return {...state, inProgress:true};
    case ASYNC_COMPLETE:
      return {...state, inProgress:false};
    default:
      return state;
  }
}

function feedList(state = INITIAL_STATE.feedList, action) {
  console.log(`store:feedList:${action.type}`, {state, action});
  switch(action.type) {
    case FEEDS_FETCH_INVALIDATE:
      return {...state, didInvalidate:true};
    case FEEDS_FETCH_COMPLETE:
      return {...state, err:action.err, feeds:toFeedMap(action.feeds), didInvalidate:false};
    case FEEDS_UPDATE: {
      const {feed} = action;
      const feeds = {...state.feeds, [feed.id]:feed};
      return {...state, feeds:feeds};
    }
    case FEEDS_DELETE: {
      const {feed} = action;
      const feeds = {...state.feeds};
      delete feeds[feed.id];
      return {...state, feeds:feeds};
    }
    default:
      return state;
  }
}

function toFeedMap(feedList) {
  const feeds = feedList.reduce((feeds, feed) => {
    feeds[feed.id] = feed;
    return feeds;
  }, {});
  return feeds;
}

function feed(state = INITIAL_STATE.feed, action) {
  console.log(`store:feed:${action.type}`, {state, action});
  switch(action.type) {
    case FEED_CREATE:
      return {...state, feed:action.feed};
    case FEED_DESELECT:
      const deselect = {...state};
      delete deselect.feed;
      return deselect;
    case FEED_SELECT:
      return {...state, feed:action.feed};
    case FEED_UPDATE:
      return {...state, feed:action.feed};
    case FEED_ITEM_ADD: {
      const items = state.feed.items.concat(action.item);
      const feed = {...state.feed, items};
      return {...state, feed};
    }
    case FEED_ITEM_UPDATE: {
      const {item, feed} = action;
      const items = feed.items
        .filter(i => i.id !== item.id)
        .concat(item);
      const updatedFeed = {...state.feed, items};
      return {...state, feed:updatedFeed};
    }
    case FEED_ITEM_INSERT: {
      const {item, index} = action;
      const items = [...state.feed.items];
      items.splice(index, 0, item);
      const feed = {...state.feed, items};
      return {...state, feed};
    }
    case FEED_ITEM_DELETE: {
      const {item, feed} = action;
      const items = feed.items.filter(i => i != item);
      const updatedFeed = {...feed, items};
      return {...state, feed:updatedFeed};
    }
    default:
      return state;
  }
}


const rootReducer = combineReducers({feedList, feed, asyncState});

const createStoreWithMiddleware = applyMiddleware(
  thunkMiddleware,
  createLoggerMiddleware()
)(createStore);

export default function configureStore(initialState) {
  return createStoreWithMiddleware(rootReducer, initialState);
}
