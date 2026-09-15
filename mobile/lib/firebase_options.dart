import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        return macos;
      case TargetPlatform.windows:
        return windows;
      case TargetPlatform.linux:
        throw UnsupportedError('Linux not supported');
      default:
        throw UnsupportedError('Platform not supported');
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: const String.fromEnvironment('FIREBASE_API_KEY', defaultValue: 'YOUR_API_KEY'),
    appId: '1:865034931621:web:39378efc2f45cca507ec4c',
    messagingSenderId: '865034931621',
    projectId: 'correlatio-f4986',
    authDomain: 'correlatio-f4986.firebaseapp.com',
    storageBucket: 'correlatio-f4986.firebasestorage.app',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: const String.fromEnvironment('FIREBASE_API_KEY', defaultValue: 'YOUR_API_KEY'),
    appId: '1:865034931621:android:e1234567890abcdef', // Needs real Android App ID eventually
    messagingSenderId: '865034931621',
    projectId: 'correlatio-f4986',
    storageBucket: 'correlatio-f4986.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: const String.fromEnvironment('FIREBASE_API_KEY', defaultValue: 'YOUR_API_KEY'),
    appId: '1:865034931621:ios:e1234567890abcdef', // Needs real iOS App ID eventually
    messagingSenderId: '865034931621',
    projectId: 'correlatio-f4986',
    storageBucket: 'correlatio-f4986.firebasestorage.app',
    iosBundleId: 'com.itisnahom.correlatio',
  );

  static const FirebaseOptions macos = ios;
  static const FirebaseOptions windows = web;
}
