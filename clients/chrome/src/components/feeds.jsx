import React, {PropTypes} from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import { fetchFeedsIfNeeded, createFeed } from '../actions';
import Session from '../session';
import { Users } from '../api';
import Home from './home.jsx';

@connect(state => state.feedList)
export default class FeedList extends React.Component {

  static propTypes = {
    children: PropTypes.any,
    dispatch: PropTypes.func.isRequired,
  }

  static contextTypes = {
    history: PropTypes.object.isRequired,
  }

  componentDidMount() {
    console.log('feed list, component did mount');
    const { dispatch } = this.props;
    dispatch(fetchFeedsIfNeeded());
  }

  handleAddNew() {
    this.context.history.replaceState(null, '/feeds/new');
  }

  render() {
    const { feeds, isFetching, children, dispatch, err } = this.props;
    const feedNodes = Object.values(feeds).map(feed => this.renderFeed(feed));
    const userMenu = this.renderUserMenu();

    const content = children != null ? children : <Home feeds={feeds} dispatch={dispatch} />;

    return (
      <div>
        <div className='container-fluid'>
          <div className='row'>
            <div className='col-sm-3 col-md-2 sidebar'>
              {userMenu}

              {isFetching &&
                <div className='loading'>Loading...</div>
              }

              {!isFetching &&
                <ul className='nav nav-sidebar navbar-nav feeds-sidebar'>

                  <li className={this.props.params.feedID == null ? 'active' : ''}>
                    <Link className='feed-link' to='/feeds'>
                      <span className='glyphicon glyphicon-home' aria-hidden='true'></span>
                      {' '}
                      home
                    </Link>
                  </li>

                  {feedNodes}
                  <li className='feed-add-new'>
                    <hr />
                    <a href='#' onClick={e => this.handleCreateFeed(e)}>
                      <span className='glyphicon glyphicon-plus' aria-hidden='true'></span>
                      {' '}
                      add new feed
                    </a>
                  </li>
                </ul>
              }
              </div>
          </div>
        </div>

        <div className="col-sm-9 col-sm-offset-3 col-md-10 col-md-offset-2 main">
          {content}

          {err &&
            <span className='error'>
              {err.message || err.toString()}
            </span>
          }

        </div>
      </div>
    );
  }

  renderFeed(feed) {

    const selected = this.props.params.feedID === feed.id;
    const className = (selected) ? 'active' : undefined;

    return (
      <li key={feed.id} className={className}>
        <Link className='feed-link' to={`/feeds/${feed.id}`}>
          <span className='glyphicon glyphicon-th-list' aria-hidden='true'></span>
          {' '}
          {feed.title}
        </Link>
      </li>
    );
  }

  renderSummary(feeds) {
    const items = Object.values(feeds).map(feed => this.renderSummaryFeed(feed));
    return (
      <ol className='feeds-summary'>
        {items}
      </ol>
    );
  }

  renderSummaryFeed(feed) {
    const itemCount = feed.items.length;
    return (
      <li key={feed.id}>
        <Link className='feed-link' to={`/feeds/${feed.id}`}>
          {feed.title}
        </Link>
        {' '}
        ({itemCount} items)
      </li>
    );
  }

  renderUserMenu() {
    const user = Session.get('user');

    return (
      <ul className='nav nav-sidebar'>
        <li className="dropdown">
          <a href="#" className="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
            {user.email}
            <span className="caret"></span>
          </a>
          <ul className="dropdown-menu">
            <li>
              <a className='signout' onClick={e => this.handleSignout(e)}>
                <span className='glyphicon glyphicon-log-out' aria-hidden="true"></span>
                {' '}
                signout
              </a>
            </li>
          </ul>
        </li>
        <li role='separator' className='divider'><hr /></li>
      </ul>

    );
  }

  handleSignout() {
    Users.signout();
  }

  handleCreateFeed(e) {
    e.preventDefault();
    const {dispatch} = this.props;
    const title = this.defaultNewTitle();
    dispatch(createFeed(title));
  }

  defaultNewTitle() {
    const NEW_TITLE_PFX = 'New Feed ';
    const {feeds} = this.props;
    const extractor = new RegExp(`^${NEW_TITLE_PFX}(\\d+)$`);
    const maxIdx = Math.max(...Object.values(feeds).map(({title}) => {
      const match = extractor.exec(title);
      if (match) {
        return parseInt(match[1]);
      } else {
        return 0;
      }
    }));
    const title = NEW_TITLE_PFX + (maxIdx + 1);
    return title;
  }
}
