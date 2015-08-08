import * as constants from './constants';

const initialState = {
  feeds: [],
};

const actionsMap = {
  [constants.GET_FEEDS]: (state, action) => ({ feeds: action.feeds }),
  // [constants.FETCH_REPO]: (state, action) => ({ repo: action.repo }),
  // [constants.FETCH_USER_STARGAZERS]: (state, action) => (
  //   {
  //     stargazers: Object.assign({}, state.stargazers, {
  //       user: action.stargazers,
  //       pagination: action.pagination
  //     })
  //   }),
  // [constants.FETCH_REPO_STARGAZERS]: (state, action) => (
  //   {
  //     stargazers: Object.assign({}, state.stargazers, {
  //       repo: action.stargazers,
  //       pagination: action.pagination
  //     })
  //   })
};

export default function stores (state = initialState, action) {
  const reduceFn = actionsMap[action.type];
  if (!reduceFn) { return state; }

  return Object.assign({}, state, reduceFn(state, action));
}
