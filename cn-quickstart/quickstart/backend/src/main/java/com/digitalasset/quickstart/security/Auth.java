package com.digitalasset.quickstart.security;

/**
 * Marker enum for the active authentication mode.
 * {@link #OAUTH2} for production OIDC, {@link #SHARED_SECRET} for the demo profile.
 */
public enum Auth {
    OAUTH2,
    SHARED_SECRET
}
