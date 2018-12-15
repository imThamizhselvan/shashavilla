import React, { Component } from 'react';
import TopBar from '../TopBar';
import MainLayout from '../MainLayout';
import Facilities from '../Facilities';
import Tariff from '../Tariff';

class Home extends Component {
  render() {
    return (
      <div>
        <TopBar />
        <div style={{overflow: 'hidden'}}>
        <MainLayout />
        <Facilities />
        <Tariff />
        </div>
      </div>
    );
  }
}

export default Home;
