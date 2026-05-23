import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MapScreen from '@/screens/MapScreen';
import TasksScreen from '@/screens/TasksScreen';
import ProfileScreen from '@/screens/ProfileScreen';

export type RootTabParamList = {
  Map:
    | {
        focusFlag?: { id: string; lat: number; lng: number };
        ts?: number;
      }
    | undefined;
  Tasks: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const tabIcon = (emoji: string) => ({ color }: { color: string }) => (
  <Text style={{ fontSize: 20, color }}>{emoji}</Text>
);

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#2f80ed',
          tabBarInactiveTintColor: '#8a8a8a',
          headerTitleAlign: 'center',
        }}
      >
        <Tab.Screen
          name="Map"
          component={MapScreen}
          options={{ tabBarIcon: tabIcon('🗺️') }}
        />
        <Tab.Screen
          name="Tasks"
          component={TasksScreen}
          options={{ tabBarIcon: tabIcon('✅') }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ tabBarIcon: tabIcon('👤') }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
