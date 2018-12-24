import React, { Component } from 'react';
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { Carousel } from 'react-responsive-carousel';
import { Galleries, Header } from './style';

class Gallery extends Component {
  render() {
    return (
      <Galleries id="gallery">
        <Header>
          <h1>Gallery</h1>
          <p>This is how your vacations looks in Pondy.</p>
        </Header>
        <Carousel showArrows={true} >
            <div>
                <img src={require('./building.jpeg')} />
                <p className="legend">Traditional French style Villa outside with ample space</p>
            </div>
            <div>
                <img src={require('./room.jpeg')} />
                <p className="legend">Spacious room to create memories</p>
            </div>
            <div>
                <img src={require('./room1.jpeg')} />
                <p className="legend">Cottage House </p>
            </div>
            <div>
                <img src={require('./room2.jpeg')} />
                <p className="legend">Fully airconditioned room</p>
            </div>
            <div>
                <img src={require('./building.jpeg')} />
                <p className="legend">Traditional French style Villa outside with ample space</p>
            </div>
            <div>
                <img src={require('./room.jpeg')} />
                <p className="legend">Spacious room to create memories</p>
            </div>
            <div>
                <img src={require('./room1.jpeg')} />
                <p className="legend">Cottage House </p>
            </div>
            <div>
                <img src={require('./room2.jpeg')} />
                <p className="legend">Fully airconditioned room</p>
            </div>
        </Carousel>
      </Galleries>
    );
  }
}

export default Gallery;
