import React, {findDOMNode} from 'react';
import {
  saveFeedItem,
  // removeFeedItem,
} from '../actions';

export default class FeedItem extends React.Component {
  //
  // componentDidMount() {
  //   this.setItem(this.props.params.itemID);
  // }
  //
  // componentWillReceiveProps(nextProps) {
  //   this.setItem(nextProps.params.itemID);
  // }
  //
  // setItem(itemID) {
  //   const {feed} = this.props;
  //   const item = itemID != null ? feed.items.find((item) => item.id === itemID) : { };
  //   this.setState({item});
  // }


  render() {
    return (<div>hello world</div>);
    // const {item} = this.this.state.item;
    //
    // return (
    //   <form>
    //     <div className='form-group'>
    //       <label htmlFor='item-title'>Title</label>
    //       <input type='text' className='form-control' id='item-title' defaultValue={item.title} placeholder='title'
    //         onChange={(e) => this.handleOnChange('title', e)}
    //       />
    //     </div>
    //     <div className='form-group'>
    //       <label htmlFor='item-link'>Link</label>
    //       <input type='url' className='form-control' id='item-link' defaultValue={item.link} placeholder='http://'
    //         onChange={(e) => this.handleOnChange('link', e)}
    //       />
    //     </div>
    //     <div className='form-group'>
    //       <label htmlFor='item-description'>description</label>
    //       <textarea className='form-control' id='item-description' defaultValue={item.description} placeholder='description'
    //         onChange={(e) => this.handleOnChange('description', e)}
    //       />
    //     </div>
    //     <button type='submit' className='btn btn-default' onClick={e => this.handleSave(e)} >
    //       <span className='glyphicon glyphicon-save' aria-hidden="true"></span>
    //       {' '}
    //       save
    //     </button>
    //     <button type='submit' className='btn btn-save btn-danger' onClick={e => this.handleRemove(e)} >
    //       <span className='glyphicon glyphicon-remove' aria-hidden="true"></span>
    //       {' '}
    //       remove
    //     </button>
    //   </form>
    // );
  }

  handleSave() {
    event.preventDefault();

    const {feed, dispatch} = this.props;
    const {itemID} = this.props.params;
    const item = ['title', 'description', 'link'].reduce((item, field) => {
      item[field] = findDOMNode(this.refs[field]).value;
      return item;
    }, {});
    dispatch(saveFeedItem({ feed, itemID, item }));
  }

  handleOnChange(field, event) {
    const value = event.target.value;

    this.setState({
      ...this.state,
      isModified: true,
      [field] : value,
    });
  }

}
