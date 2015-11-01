import React, {PropTypes} from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import { fetchFeedsIfNeeded } from '../actions';
import Session from '../session';
import { Users } from '../api';

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
    const { feeds, isFetching, children, err } = this.props;
    const feedNodes = Object.values(feeds).map(feed => this.renderFeed(feed));
    const userMenu = this.renderUserMenu();

    const content = children != null ? children : this.renderDefaultContent(feeds);

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
                <ul className='nav nav-sidebar'>

                  <li>
                    <Link className='feed-link' to='/feeds'>
                      <span className='glyphicon glyphicon-home' aria-hidden='true'></span>
                      {' '}
                      home
                    </Link>
                  </li>

                  {feedNodes}
                  <li role='separator' className='divider'><hr /></li>
                  <li>
                    <Link className='feed-link' to='/feeds/new'>
                      <span className='glyphicon glyphicon-plus' aria-hidden='true'></span>
                      {' '}
                      add new feed
                    </Link>
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
    return (
      <li key={feed.id}>
        <Link className='feed-link' to={`/feeds/${feed.id}`}>
          <span className='glyphicon glyphicon-th-list' aria-hidden='true'></span>
          {' '}
          {feed.title}
        </Link>
      </li>
    );
  }

  renderDefaultContent(feeds) {
    return this.renderQuickAddItem(feeds);
  }

  renderQuickAddItem(feeds) {
    const dropdown = this.renderQuickAddDropdown(feeds);
    return (
      <form className='form-inline'>
        <div className='form-group'>
          <label htmlFor='quick-add-title' className='sr-only'>Name</label>
          {' '}
          <input type='text' className='form-control' id='quick-add-title' placeholder='title' />
        </div>
        {' '}
        <div className='form-group'>
          <label htmlFor='quick-add-url' className='sr-only'>Email</label> {' '}
          <input type='url' className='form-control' id='quick-add-url' placeholder='http://' />
        </div>
        {' '}
        <div className='form-group'>
          {dropdown}
        </div>
        {' '}
        <button type='submit' className='btn btn-default'>Add Feed Item</button>
      </form>

    );
  }

  renderQuickAddDropdown(feeds) {
    const items = Object.values(feeds).map(feed =>
      <option required={true} value={feed.id}>{feed.title}</option>
    );
    return (
      <select>
        <option value=''>[Select Feed]</option>
        {items}
      </select>
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

}
