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
                <img src={require('./room2.jpeg')} />
                <p className="legend">World class bed linen</p>
            </div>
            <div>
                <img src={require('./room1.jpeg')} />
                <p className="legend">Spacious room to create memories</p>
            </div>
            <div>
                <img src={require('./room3.jpeg')} />
                <p className="legend">Kitchen </p>
            </div>
            <div>
                <img src={require('./lobby1.jpeg')} />
                <p className="legend">Teak wood interiors</p>
            </div>
            <div>
                <img src={require('./lobby2.jpeg')} />
                <p className="legend">Traditional French style Villa with ample space</p>
            </div>
            <div>
                <img src={require('./room5.jpeg')} />
                <p className="legend">Big window that connect with nature</p>
            </div>
            <div>
                <img src={require('./room6.jpeg')} />
                <p className="legend">Modern wood works </p>
            </div>
            <div>
                <img src={require('./room7.jpeg')} />
                <p className="legend">Fully airconditioned room</p>
            </div>
            <div>
                <img src={require('./lobby3.jpeg')} />
                <p className="legend">Well ventilated surroundings</p>
            </div>
            <div>
                <img src={require('./room8.jpeg')} />
                <p className="legend">Ample space to enjoy a relaxed stay</p>
            </div>
        </Carousel>
      </Galleries>
    );
  }
}

export default Gallery;
