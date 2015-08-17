import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunkMiddleware from 'redux-thunk';
import loggerMiddleware from 'redux-logger';
import {
  GET_FEEDS_BEGIN,
  GET_FEEDS_INVALIDATE,
  GET_FEEDS_COMPLETED,
} from './actionTypes';

const INITIAL_STATE = Object.freeze({
  isFetching: false,
  didInvalidate: true,
  feeds: [],
});

function feedList(state = INITIAL_STATE, action) {
  console.log('store:feedList:', action.type, {state, action});
  switch(action.type) {
    case GET_FEEDS_INVALIDATE:
      return {...state, didInvalidate:true};
    case GET_FEEDS_BEGIN:
      return {...state, isFetching:true};
    case GET_FEEDS_COMPLETED:
      return {...state, err:action.err, feeds:action.feeds, isFetching:false, didInvalidate:false};
    default:
      return state;
  }
}

const rootReducer = combineReducers({feedList});

const createStoreWithMiddleware = applyMiddleware(
  thunkMiddleware,
  loggerMiddleware
)(createStore);

export default function configureStore(initialState) {
  return createStoreWithMiddleware(rootReducer, initialState);
}
