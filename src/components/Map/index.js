import React, { Component } from 'react';
import ReactMapboxGl, { Layer, Feature } from "react-mapbox-gl";
import { Header } from '../Gallery/style';

export default class Map extends Component {

  render() {
    const Map = ReactMapboxGl({
      accessToken: "pk.eyJ1IjoiZmFicmljOCIsImEiOiJjaWc5aTV1ZzUwMDJwdzJrb2w0dXRmc2d0In0.p6GGlfyV-WksaDV_KdN27A"
    });
      return (
        <div id="map" style={{ height: '100vh', width: '100%' }}>
          <Header>
            <h1>Location</h1>
            <p>We are waiting for you here.</p>
          </Header>
          <Map
            style="mapbox://styles/mapbox/streets-v9"
            containerStyle={{
              height: "100vh",
              width: "100vw"
            }}>
              <Layer
                type="symbol"
                id="marker"
                layout={{ "icon-image": "marker-15" }}>
                <Feature coordinates={[-0.481747846041145, 51.3233379650232]}/>
              </Layer>
          </Map>
        </div>
      )
    }
}
