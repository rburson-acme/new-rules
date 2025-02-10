import { Redirect, useNavigation, usePathname } from 'expo-router';
import { StyleSheet } from 'react-native';

import React from 'react';

export default function NotFoundScreen() {
  const navigation = usePathname();
  console.log({ navigation });
  return <Redirect href={'/sign-in'} />;
}

const styles = StyleSheet.create({});
