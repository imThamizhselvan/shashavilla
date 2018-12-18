import React, { Component } from 'react';
import TopBar from '../TopBar';
import MainLayout from '../MainLayout';
import Facilities from '../Facilities';
import Tariff from '../Tariff';
import Gallery from '../Gallery';
import Map from '../Map';
import Contact from '../Contact';

class Home extends Component {
  render() {
    return (
      <div>
        <TopBar />
        <div style={{overflow: 'hidden'}}>
          <MainLayout />
          <Facilities />
          <Tariff />
          <Gallery />
          <Map />
          <Contact />
        </div>
      </div>
    );
  }
}

export default Home;
