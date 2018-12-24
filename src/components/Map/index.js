import React, { Component } from 'react';
import ReactMapboxGl, { Layer, Marker, Feature, ZoomControl } from "react-mapbox-gl";
import { Header } from '../Gallery/style';
import { MapMarkerStyle } from './style';

export default class Map extends Component {

  render() {
    const filtered_points = [
        {
          name: 'ShaSha Villa',
          points: [79.8362, 11.9898],
        }];

    const Map = ReactMapboxGl({
      accessToken: "pk.eyJ1IjoiamtyaXNobmEiLCJhIjoiY2lwODMyOTRlMDE2ZHRjbHl0cjdrOHY1YyJ9.EfSggaPaoVi_jUm82n8gZg"
    });
      return (
        <div id="map">
          <Header>
            <h1>Location</h1>
            <p>We are waiting for you here.</p>
          </Header>
          <Map
            style="mapbox://styles/mapbox/streets-v9"
            containerStyle={{
              height: "100vh",
              width: "100vw",
            }}
            center={[79.8362, 11.9898]}
            zoom={[8]}
            >
            <ZoomControl />

              <Layer
                type="symbol"
                id="marker"
                layout={{ "icon-image": "marker-15" }}>
              </Layer>
              {filtered_points.map((item) => {
                return (
                  <Marker
                    coordinates={item.points}
                    anchor="top"
                    >
                    <MapMarkerStyle></MapMarkerStyle>
                  </Marker>
                );
              })}

          </Map>
        </div>
      )
    }
}
