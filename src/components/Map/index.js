import React, { Component } from 'react';
import GoogleMapReact from 'google-map-react';
import { Header } from '../Gallery/style';

const AnyReactComponent = ({ text }) => <div>{ text }</div>;
export default class Map extends Component {
  static defaultProps = {
    center: { lat: 40.7446790, lng: -73.9485420 },
    zoom: 11
  }
  render() {
      return (
        <div id="map" style={{ height: '100vh', width: '100%' }}>
          <Header>
            <h1>Location</h1>
            <p>We are waiting for you here.</p>
          </Header>
          <GoogleMapReact
            defaultCenter={ this.props.center }
            defaultZoom={ this.props.zoom }>
            <AnyReactComponent
              lat={ 40.7473310 }
              lng={ -73.8517440 }
              text={ "Where's Waldo?" }
            />
          </GoogleMapReact>
        </div>
      )
    }
}
