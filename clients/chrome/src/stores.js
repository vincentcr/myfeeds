import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunkMiddleware from 'redux-thunk';
import loggerMiddleware from 'redux-logger';
import {
  FEEDS_FETCH_BEGIN,
  FEEDS_FETCH_INVALIDATE,
  FEEDS_FETCH_COMPLETE,
  FEEDS_UPDATE,
  FEED_CREATE,
  FEED_SELECT,
  FEED_EDIT_BEGIN,
  FEED_EDIT_COMPLETE,
  FEED_SAVE_BEGIN,
  FEED_SAVE_COMPLETE,
  FEED_ADD_ITEM,
  FEED_INSERT_ITEM,
  FEED_REMOVE_ITEM,
} from './actionTypes';

const INITIAL_STATE = Object.freeze({
  feedList: {
    isFetching: false,
    didInvalidate: true,
    feeds: {},
  },
  feed: {
    current: null,
    isEditing: false,
    isSaving: false,
  },
});

function feedList(state = INITIAL_STATE.feedList, action) {
  console.log(`store:feedList:${action.type}`, {state, action});
  switch(action.type) {
    case FEEDS_FETCH_INVALIDATE:
      return {...state, didInvalidate:true};
    case FEEDS_FETCH_BEGIN:
      return {...state, isFetching:true};
    case FEEDS_FETCH_COMPLETE:
      return {...state, err:action.err, feeds:toFeedMap(action.feeds), isFetching:false, didInvalidate:false};
    case FEEDS_UPDATE:
      const feed = action.feed;
      const feeds = {...state.feeds, [feed.id]:feed};
      return {...state, feeds:feeds};
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
      return {...state, currentFeed:action.feed, origFeed:action.feed};
    case FEED_SELECT:
      return {...state, currentFeed:action.feed, origFeed:action.feed};
    case FEED_EDIT_BEGIN:
      return {...state, isEditing:true};
    case FEED_EDIT_COMPLETE:
      return {...state, isEditing:false, currentFeed:action.feed};
    case FEED_SAVE_BEGIN:
      return {...state, isSaving:true};
    case FEED_SAVE_COMPLETE:
      return {...state, err:action.err, isSaving:false};
    case FEED_ADD_ITEM: {
      const items = state.currentFeed.items.concat(action.item);
      const currentFeed = {...state.currentFeed, items};
      return {...state, currentFeed};
    }
    case FEED_INSERT_ITEM: {
      const {item, index} = action;
      const items = [...state.currentFeed.items];
      items.splice(index, 0, item);
      const currentFeed = {...state.currentFeed, items};
      return {...state, currentFeed};
    }
    case FEED_REMOVE_ITEM: {
      const items = state.currentFeed.items.filter((item) => item != action.item);
      const currentFeed = {...state.currentFeed, items};
      return {...state, currentFeed};
    }
    default:
      return state;
  }
}


const rootReducer = combineReducers({feedList, feed});

const createStoreWithMiddleware = applyMiddleware(
  thunkMiddleware,
  loggerMiddleware
)(createStore);

export default function configureStore(initialState) {
  return createStoreWithMiddleware(rootReducer, initialState);
}
