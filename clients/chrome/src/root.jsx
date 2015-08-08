import React, { PropTypes } from 'react';
import { Redirect, Router, Route } from 'react-router';
import HashHistory from 'react-router/lib/HashHistory';
import { createDispatcher, createRedux, composeStores } from 'redux';
import { Provider } from 'redux/react';
import * as components from './components.jsx';
import * as stores from './stores';

// export default function init() {

//   const routes = (
//     <Route handler={components.App}>
//       <Route name="signin" path="signin" handler={components.Signin}/>
//       <Route path="feeds" component={components.Feeds}>
//         <Route name="feed" path="/feeds/:feedID" component={components.Feed}/>
//       </Route>
//     </Route>
//   );

//   Router.run(routes, Router.HashLocation, (Root) => {
//     React.render(<Root/>, document.body);
//   });

// }

const dispatcher = createDispatcher(
  composeStores(stores)
  //getState => [ thunkMiddleware(getState), loggerMiddleware ]
);
const redux = createRedux(dispatcher);


export default class Root extends React.Component {

  static create(rootNode) {
    const history = new HashHistory();
    React.render(<Root history={history} />, rootNode);
  }

  render () {
    const { history } = this.props;
    return (
      <Provider redux={redux}>
        {renderRoutes.bind(null, history)}
      </Provider>
    );
  }
}

Root.propTypes = {
  history: PropTypes.object.isRequired,
};


function renderRoutes (history) {
  return (
    <Router history={history}>
      <Route component={components.App}>
        <Route name="signin" path="signin" component={components.Signin}/>
        <Route path="/feeds" component={components.Feeds}>
          <Route name="feed" path="/feeds/:feedID" component={components.Feed}/>
        </Route>
      </Route>
      <Redirect from="/" to="/feeds" />
    </Router>
  );
}
