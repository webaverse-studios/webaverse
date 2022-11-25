import * as React from 'react';
import {AppContext} from '../app';
import {Location} from '../general/location';
import {Settings} from '../general/settings';
import {Modal} from './modal';

export default function Modals() {
  const {state, setState} = React.useContext(AppContext);
  if (state?.openedModal === 'settings') {
    return <Modal component={Settings} title="Settings" />;
  } else if (state?.openedModal === 'location') {
    return <Modal component={Location} title="Location" />;
  } else {
    return null;
  }
}
