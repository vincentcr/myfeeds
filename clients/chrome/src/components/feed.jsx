import React, {findDOMNode, PropTypes} from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router';
import classNames from 'classnames';
import {
  fetchCurrentFeedIfNeeded,
  beginEditFeed,
  createFeed,
  saveFeed,
  cancelEditFeed,
  addFeedItem,
  removeFeedItem,
} from '../actions';

@connect(state => state.feed)
export default class Feed extends React.Component {

  constructor() {
   super();
   this.state = { };
  }

  static propTypes = {
    children: PropTypes.any,
    dispatch: PropTypes.func.isRequired,
  }

  componentDidMount() {
    const feedID = this.props.params.feedID;
    this._loadFeed(feedID);
  }

  componentWillReceiveProps(nextProps) {
    const nextFeedID = nextProps.params.feedID;
    this._loadFeed(nextFeedID);
  }

  _loadFeed(newFeedID) {
    const {feedID} = this.state;
    if (newFeedID !== feedID) {
      console.log(`loadFeed:${newFeedID}; current:${feedID}`);
      const {dispatch} = this.props;
      this.setState({feedID:newFeedID});
      if (newFeedID === 'new') {
        dispatch(createFeed());
        dispatch(beginEditFeed());
      } else {
        dispatch(fetchCurrentFeedIfNeeded(newFeedID));
      }
    }
  }


  handleBeginEditFeed(event) {
    event.preventDefault();
    this.props.dispatch(beginEditFeed());
  }

  handleSaveFeed(event) {
    event.preventDefault();
    const title = findDOMNode(this.refs.title).value;
    const items = this.getItems().map(item => item.state);
    const id = this.props.currentFeed.id;
    this.props.dispatch(saveFeed({ id, title, items }));
  }

  handleCancelEditFeed(event) {
    event.preventDefault();
    if (!this.isModified() || confirm('You have unsaved changes. Continue?')) {
      this.props.dispatch(cancelEditFeed());
    }
  }

  handleAddItem(event) {
    event.preventDefault();
    this.markModified();
    this.props.dispatch(addFeedItem());
  }

  markModified() {
    this.setState({ isModified: true });
  }

  isModified() {
    return this.state.isModified || this.getItems().some(item => item.state.isModified);
  }

  render() {
    const cssClasses = classNames({
      'feed' : true,
      'edit-mode' : this.props.isEditing,
    });
    const feed = this.props.currentFeed;
    const {isEditing, dispatch, children} = this.props;
    const showAsEmpty = feed != null && feed.items.length === 0 && !isEditing;
    return (
      <div className={cssClasses}>
        {!feed &&
          <div className='loading'>Loading...</div>
        }
        {feed &&
          <div>
            { this.renderButtons() }
            { this.renderTitle() }
            {showAsEmpty &&
              <div>(empty)</div>
            }
            {!showAsEmpty &&
              <FeedItemList ref='itemList' dispatch={dispatch} isEditing={isEditing} feed={feed} />
            }
          </div>
        }
        {children &&
          <div>
            {this.props.children}
          </div>
        }
      </div>
    );
  }

  getItems() {
    const itemList = this.refs.itemList;
    const items = itemList.getItems();
    return items;
  }

  renderButtons() {
    const buttons = !this.props.isEditing? this.viewButtons() : this.editButtons();
    return (
      <div className='btn-group btn-toolbar' role="group" >
        {buttons}
      </div>
    );
  }

  viewButtons() {
    return [
      <button className='add-item btn btn-primary' onClick={e => this.handleBeginEditFeed(e)}>
        <span className='glyphicon glyphicon-edit' aria-hidden="true"></span>
        {' '}
        edit
      </button>,
      <button className='btn btn-default btn-danger' onClick={(e) => this.handleDelete(e)}>
        <span className="glyphicon glyphicon-trash" aria-hidden="true"></span>
        {' '}
        delete
      </button>,
    ];
  }

  editButtons() {
    return [
      <button className='add-item btn btn-primary' onClick={e => this.handleAddItem(e)}>
        <span className='glyphicon glyphicon-plus' aria-hidden="true"></span>
        {' '}
        add item
      </button>,
      <button className='save btn btn-default btn-success' onClick={e => this.handleSaveFeed(e)}>
        <span className='glyphicon glyphicon-ok' aria-hidden="true"></span>
        {' '}
        save
      </button>,
      <button className='cancel btn btn-danger' onClick={e => this.handleCancelEditFeed(e)}>
        <span className='glyphicon glyphicon-remove' aria-hidden="true"></span>
        {' '}
        cancel
      </button>,
    ];
  }

  renderTitle() {
    const {title} = this.props.currentFeed;
    if (!this.props.isEditing) {
      return this.renderTitleView(title);
    } else {
      return this.renderTitleEdit(title);
    }
  }

  renderTitleView(title) {
    return (
      <h2 className='title'>
        {title}
      </h2>
    );
  }

  renderTitleEdit(title) {
    return (
      <form className="form-inline">
        <div className="form-group">
          <label htmlFor="feed-title">Feed Title</label> {' '}
          <input type='text' className="form-control"
            id='feed-title' ref='title' placeholder='title'
            defaultValue={title} onChange={e => this.markModified(e)}
          />
        </div>
      </form>
    );
  }
}

class FeedItemList extends React.Component {

  static propTypes = {
    dispatch: PropTypes.func.isRequired,
  }

  getItems() {
    const items = Object.keys(this.refs)
      .filter(key => key.startsWith('item_'))
      .map(key => this.refs[key]);
    return items;
  }

  render() {
    const {feed} = this.props;
    const itemNodes = feed.items.map((item, idx) => React.createElement(FeedItem, {
        item,
        feedID: feed.id,
        idx: idx,
        key: item.id,
        dispatch: this.props.dispatch,
        isEditing: this.props.isEditing,
        ref: `item_${idx}`,
    }));
    return (
      <table className='feed-item-table table table-condensed' style={{width: 'auto'}}>
        <thead>
          <tr>
            <th> # </th>
            <th> title </th>
            <th> link </th>
            <th> description </th>
            <th> </th>
          </tr>
        </thead>
        <tbody>
          {itemNodes}
        </tbody>
      </table>
      );
  }
}

class FeedItem extends React.Component {

  constructor(props) {
    super(props);
    const {item} = this.props;
    this.state = {...item};
  }

  static propTypes = {
    dispatch: PropTypes.func.isRequired,
  }

  handleOnChange(field, event) {
    const value = event.target.value;
    this.setState({
      ...this.state,
      isModified: true,
      [field] : value,
    });
  }

  handleDelete() {
    const {dispatch, item} = this.props;
    dispatch(removeFeedItem(item));
  }


  render() {
    const {idx,item,isEditing,feedID} = this.props;
    const cells = isEditing ? this.renderEditCells(item) : this.renderViewCells(item);
    return (
      // <li className='feed-item'> {node} </li>
      <tr>
        <td>{idx + 1}.</td>
        {cells}
        <td>
          <a href={item.link} target={item.id} className="btn btn-default">
              <span className="glyphicon glyphicon-new-window" aria-hidden="true"></span>
          </a>
          {' '}
          <Link className='feed-item-link' to={`/feeds/${feedID}/items/${item.id}`}>
            <span className='glyphicon glyphicon-edit' aria-hidden='true'></span>
          </Link>
          {' '}
          <button className='btn btn-default btn-danger' onClick={(e) => this.handleDelete(e)}>
              <span className="glyphicon glyphicon-trash" aria-hidden="true"></span>
          </button>
        </td>
      </tr>
    );
  }

  renderViewCells(item) {
    return [
        <td>{item.title}</td>,
        <td>{item.link}</td>,
        <td>{item.description}</td>,
    ];
  }

  renderEditCells(item) {
    return [
      <td>
        <input type='text' ref='title' defaultValue={item.title} placeholder='title' onChange={(e) => this.handleOnChange('title', e)} />
      </td>,
      <td>
        <input type='text' ref='link' defaultValue={item.link} placeholder='link' onChange={(e) => this.handleOnChange('link', e)} />
      </td>,
      <td>
        <input type='text' ref='description' defaultValue={item.description} placeholder='description' onChange={(e) => this.handleOnChange('description', e)} />
      </td>,
    ];
  }

}
