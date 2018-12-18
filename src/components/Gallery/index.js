import React, { Component } from 'react';
import { Header, Row, Column, Img } from './style';

class Gallery extends Component {
  render() {
    return (
      <div id="gallery">
        <Header>
          <h1>Gallery</h1>
          <p>This is how your vacations looks in Pondy.</p>
        </Header>
        <Row>
          <Column>
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
          </Column>
          <Column>
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
          </Column>
          <Column>
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
          </Column>
          <Column>
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
            <img src={require('./mist.jpg')} />
          </Column>
        </Row>
      </div>
    );
  }
}

export default Gallery;
