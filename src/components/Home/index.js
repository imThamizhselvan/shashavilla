import React, { Component, Suspense } from 'react';
import TopBar from '../TopBar';
import MainLayout from '../MainLayout';
import Facilities from '../Facilities';
import Tariff from '../Tariff';
import Contact from '../Contact';

class Home extends Component {
  render() {
    const Map = React.lazy(() => import('../Map'));
    const Gallery = React.lazy(() => import('../Gallery'));
    return (
      <div>
        <TopBar />
        <div style={{overflow: 'hidden'}}>
          <MainLayout />
          <Facilities />
          <Tariff />
          <Suspense fallback={`<div> Loading ... </div>`}>
            <Gallery />
          </Suspense>
          <Suspense fallback={`<div> Loading.. </div>`}>
            <Map />
          </Suspense>
          <Contact />
        </div>
      </div>
    );
  }
}

export default Home;
