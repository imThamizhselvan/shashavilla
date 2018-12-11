import React, { Component } from 'react';
import TopBar from '../TopBar';
import MainLayout from '../MainLayout';
import { Title } from './style.js';

class Home extends Component {
  render() {
    return (
      <div>
        <TopBar />
        <MainLayout />
      </div>
    );
  }
}

export default Home;
