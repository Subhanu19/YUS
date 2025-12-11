package com.yourapp

import com.facebook.react.ReactApplication
import com.facebook.react.bridge.ReactApplicationContext

object ReactNativeHostHelper {
    val reactContext: ReactApplicationContext?
        get() {
            val app = ApplicationHolder.application
            return (app as? ReactApplication)
                ?.reactNativeHost
                ?.reactInstanceManager
                ?.currentReactContext
        }
}
