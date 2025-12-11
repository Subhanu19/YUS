package com.yellohbus

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Register your WebSocketPackage manually
          add(WebSocketPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()

    // VERY IMPORTANT — required for accessing RN context from native service
    ApplicationHolder.application = this

    // Load React Native
    loadReactNative(this)
  }
}

override fun getPackages(): List<ReactPackage> {
    val packages = PackageList(this).packages.toMutableList()
    packages.add(WebSocketPackage())
    return packages
}
