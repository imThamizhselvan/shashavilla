import React, { Component } from 'react';
import { Bar, Logo, MenuItem, Item } from './style';

class TopBar extends Component {
  render() {
    return (
      <Bar>
        <Logo> ShaSha Villa </Logo>
        <MenuItem>
          <Item> Facilities </Item>
          <Item> Tariff </Item>
          <Item> Gallery </Item>
          <Item> Location </Item>
          <Item> Contact </Item>
        </MenuItem>
      </Bar>
    );
  }
}

export default TopBar;
