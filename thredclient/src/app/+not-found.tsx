import { Redirect } from 'expo-router';
import { StyleSheet } from 'react-native';

import React from 'react';

export default function NotFoundScreen() {
  return <Redirect href={'/sign-in'} />;
}

const styles = StyleSheet.create({});
