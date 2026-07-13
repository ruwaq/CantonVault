import type {
  OpenAPIClient,
  Parameters,
  UnknownParamsObject,
  OperationResponse,
  AxiosRequestConfig,
} from 'openapi-client-axios';

declare namespace Components {
    namespace Parameters {
        export type CommandId = string;
        export type ContractId = string;
        export type TenantId = string;
    }
    export interface PathParameters {
        ContractId?: Parameters.ContractId;
        TenantId?: Parameters.TenantId;
    }
    export interface QueryParameters {
        CommandId?: Parameters.CommandId;
    }
    namespace Responses {
        export type BadRequest = Schemas.ErrorResponse;
        export type Conflict = Schemas.ErrorResponse;
        export type Forbidden = Schemas.ErrorResponse;
        export type InternalError = Schemas.ErrorResponse;
        export type NotFound = Schemas.ErrorResponse;
        export type Unauthorized = Schemas.ErrorResponse;
    }
    namespace Schemas {
        export interface AppInstall {
            contractId: string;
            provider: string;
            user: string;
            meta: Metadata;
            numLicensesCreated: number;
            licenseNum: number;
        }
        export interface AppInstallCancel {
            meta: Metadata;
        }
        export interface AppInstallCreateLicenseRequest {
            params: LicenseParams;
        }
        export interface AppInstallCreateLicenseResult {
            installId?: string;
            licenseId?: string;
        }
        export interface AppInstallRequest {
            contractId: string;
            provider: string;
            user: string;
            meta: Metadata;
        }
        export interface AppInstallRequestAccept {
            installMeta: Metadata;
            meta: Metadata;
        }
        export interface AppInstallRequestCancel {
            meta: Metadata;
        }
        export interface AppInstallRequestReject {
            meta: Metadata;
        }
        export interface AuthenticatedUser {
            name: string;
            party: string;
            roles: string[];
            isAdmin: boolean;
            walletUrl: string;
        }
        export interface CompleteLicenseRenewalRequest {
            /**
             * The contract ID of the LicenseRenewalRequest to complete
             */
            renewalRequestContractId: string;
            /**
             * The contract ID of the accepted allocation
             */
            allocationContractId: string;
        }
        export interface ErrorResponse {
            /**
             * example:
             * TenantId is required
             */
            message?: string | null;
        }
        export interface FeatureFlags {
            authMode?: "oauth2";
        }
        export interface License {
            contractId: string;
            provider: string;
            user: string;
            params: LicenseParams;
            expiresAt: string; // date-time
            licenseNum: number;
            isExpired: boolean;
            renewalRequests?: LicenseRenewalRequest[];
        }
        export interface LicenseExpireRequest {
            meta: Metadata;
        }
        export interface LicenseParams {
            meta?: Metadata;
        }
        /**
         * Parameters used to initiate a license renewal.
         */
        export interface LicenseRenewRequest {
            /**
             * License fee amount
             */
            licenseFeeCc: number;
            /**
             * ISO-8601 duration specifying the requested extension period (e.g. 'P30D' for 30 days).
             */
            licenseExtensionDuration: string;
            /**
             * ISO-8601 duration after which the allocation request will be not accepted.
             */
            prepareUntilDuration: string;
            /**
             * ISO-8601 duration within which the transfer must be settled.
             */
            settleBeforeDuration: string;
            /**
             * Human-readable explanation of the renewal request.
             */
            description: string;
        }
        export interface LicenseRenewalRequest {
            contractId: string;
            provider: string;
            user: string;
            licenseNum: number;
            licenseFeeAmount: number;
            licenseFeeInstrument: string;
            /**
             * RelTime representing how long the license should be extended.
             */
            licenseExtensionDuration: string;
            /**
             * The time until the license renewal request can be prepared.
             */
            prepareUntil: string; // date-time
            /**
             * The time before which the payment must be settled.
             */
            settleBefore: string; // date-time
            /**
             * The time until the license renewal request can be prepared.
             */
            requestedAt: string; // date-time
            description: string;
            requestId: string;
            allocationCid?: string;
            prepareDeadlinePassed: boolean;
            settleDeadlinePassed: boolean;
        }
        export interface LicenseRenewalResult {
            licenseId?: string;
        }
        export interface LoginLink {
            name: string;
            url: string;
        }
        export interface Metadata {
            data?: {
                [name: string]: string;
            };
        }
        export interface TenantRegistration {
            /**
             * Tenant identifier
             */
            tenantId: string;
            /**
             * Party identifier
             */
            partyId: string;
            /**
             * Wallet URL for payment redirects
             */
            walletUrl: string; // uri
            /**
             * OAuth2 client identifier
             */
            clientId?: string;
            /**
             * Issuer URL
             */
            issuerUrl?: string; // uri
            /**
             * Internal registration
             */
            internal: boolean;
            users?: string[];
        }
        export interface TenantRegistrationRequest {
            tenantId: string;
            partyId: string;
            walletUrl: string;
            /**
             * Required for OAuth2 tenant registrations
             */
            clientId?: string;
            /**
             * Required for OAuth2 tenant registrations
             */
            issuerUrl?: string;
            /**
             * Deprecated legacy field. Ignored in OAuth2-only deployments.
             */
            users?: string[];
        }
    }
}
declare namespace Paths {
    namespace AcceptAppInstallRequest {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.AppInstallRequestAccept;
        namespace Responses {
            export type $201 = Components.Schemas.AppInstall;
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace CancelAppInstall {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.AppInstallCancel;
        namespace Responses {
            export interface $204 {
            }
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace CompleteLicenseRenewal {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.CompleteLicenseRenewalRequest;
        namespace Responses {
            export type $200 = Components.Schemas.LicenseRenewalResult;
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace CreateLicense {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.AppInstallCreateLicenseRequest;
        namespace Responses {
            export type $201 = Components.Schemas.AppInstallCreateLicenseResult;
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace CreateTenantRegistration {
        export type RequestBody = Components.Schemas.TenantRegistrationRequest;
        namespace Responses {
            export type $201 = Components.Schemas.TenantRegistration;
            export type $400 = Components.Responses.BadRequest;
            export type $409 = Components.Responses.Conflict;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace DeleteTenantRegistration {
        namespace Parameters {
            export type TenantId = string;
        }
        export interface PathParameters {
            tenantId: Parameters.TenantId;
        }
        namespace Responses {
            export interface $204 {
            }
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ExpireLicense {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.LicenseExpireRequest;
        namespace Responses {
            export type $200 = string | null;
            export type $401 = Components.Responses.Unauthorized;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace GetAuthenticatedUser {
        namespace Responses {
            export type $200 = Components.Schemas.AuthenticatedUser;
            export type $401 = Components.Responses.Unauthorized;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace GetFeatureFlags {
        namespace Responses {
            export type $200 = Components.Schemas.FeatureFlags;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ListAppInstallRequests {
        namespace Responses {
            export type $200 = Components.Schemas.AppInstallRequest[];
            export type $401 = Components.Responses.Unauthorized;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ListAppInstalls {
        namespace Responses {
            export type $200 = Components.Schemas.AppInstall[];
            export type $401 = Components.Responses.Unauthorized;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ListLicenses {
        namespace Responses {
            export type $200 = Components.Schemas.License[];
            export type $401 = Components.Responses.Unauthorized;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ListLinks {
        namespace Responses {
            export type $200 = Components.Schemas.LoginLink[];
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace ListTenantRegistrations {
        namespace Responses {
            export type $200 = Components.Schemas.TenantRegistration[];
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace RejectAppInstallRequest {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = Components.Schemas.AppInstallRequestReject;
        namespace Responses {
            export interface $204 {
            }
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace RenewLicense {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        export type RequestBody = /* Parameters used to initiate a license renewal. */ Components.Schemas.LicenseRenewRequest;
        namespace Responses {
            export interface $201 {
            }
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
    namespace WithdrawLicenseRenewalRequest {
        namespace Parameters {
            export type CommandId = string;
            export type ContractId = string;
        }
        export interface PathParameters {
            contractId: Parameters.ContractId;
        }
        export interface QueryParameters {
            commandId: Parameters.CommandId;
        }
        namespace Responses {
            export interface $204 {
            }
            export type $401 = Components.Responses.Unauthorized;
            export type $403 = Components.Responses.Forbidden;
            export type $404 = Components.Responses.NotFound;
            export type $500 = Components.Responses.InternalError;
        }
    }
}


export interface OperationMethods {
  /**
   * getFeatureFlags - Get feature flags
   */
  'getFeatureFlags'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetFeatureFlags.Responses.$200>
  /**
   * listLinks - Get list of links that initiate login
   */
  'listLinks'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ListLinks.Responses.$200>
  /**
   * getAuthenticatedUser - Get Authenticated User
   */
  'getAuthenticatedUser'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetAuthenticatedUser.Responses.$200>
  /**
   * listTenantRegistrations - List all Tenant Registrations
   */
  'listTenantRegistrations'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ListTenantRegistrations.Responses.$200>
  /**
   * createTenantRegistration - Create Tenant Registration
   */
  'createTenantRegistration'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.CreateTenantRegistration.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CreateTenantRegistration.Responses.$201>
  /**
   * deleteTenantRegistration - Delete Tenant Registration
   */
  'deleteTenantRegistration'(
    parameters?: Parameters<Paths.DeleteTenantRegistration.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.DeleteTenantRegistration.Responses.$204>
  /**
   * listAppInstallRequests - List all AppInstallRequests
   */
  'listAppInstallRequests'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ListAppInstallRequests.Responses.$200>
  /**
   * acceptAppInstallRequest - Accept an AppInstallRequest
   */
  'acceptAppInstallRequest'(
    parameters?: Parameters<Paths.AcceptAppInstallRequest.QueryParameters & Paths.AcceptAppInstallRequest.PathParameters> | null,
    data?: Paths.AcceptAppInstallRequest.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.AcceptAppInstallRequest.Responses.$201>
  /**
   * rejectAppInstallRequest - Reject an AppInstallRequest
   */
  'rejectAppInstallRequest'(
    parameters?: Parameters<Paths.RejectAppInstallRequest.QueryParameters & Paths.RejectAppInstallRequest.PathParameters> | null,
    data?: Paths.RejectAppInstallRequest.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.RejectAppInstallRequest.Responses.$204>
  /**
   * listAppInstalls - List all AppInstalls
   */
  'listAppInstalls'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ListAppInstalls.Responses.$200>
  /**
   * createLicense - Create a License using the AppInstall
   */
  'createLicense'(
    parameters?: Parameters<Paths.CreateLicense.QueryParameters & Paths.CreateLicense.PathParameters> | null,
    data?: Paths.CreateLicense.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CreateLicense.Responses.$201>
  /**
   * cancelAppInstall - Cancel an AppInstall
   */
  'cancelAppInstall'(
    parameters?: Parameters<Paths.CancelAppInstall.QueryParameters & Paths.CancelAppInstall.PathParameters> | null,
    data?: Paths.CancelAppInstall.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CancelAppInstall.Responses.$204>
  /**
   * listLicenses - List all Licenses (including renewal requests)
   */
  'listLicenses'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ListLicenses.Responses.$200>
  /**
   * renewLicense - Renew a License
   */
  'renewLicense'(
    parameters?: Parameters<Paths.RenewLicense.QueryParameters & Paths.RenewLicense.PathParameters> | null,
    data?: Paths.RenewLicense.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.RenewLicense.Responses.$201>
  /**
   * completeLicenseRenewal - Complete the License Renewal
   */
  'completeLicenseRenewal'(
    parameters?: Parameters<Paths.CompleteLicenseRenewal.QueryParameters & Paths.CompleteLicenseRenewal.PathParameters> | null,
    data?: Paths.CompleteLicenseRenewal.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CompleteLicenseRenewal.Responses.$200>
  /**
   * expireLicense - Expire a License
   */
  'expireLicense'(
    parameters?: Parameters<Paths.ExpireLicense.QueryParameters & Paths.ExpireLicense.PathParameters> | null,
    data?: Paths.ExpireLicense.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ExpireLicense.Responses.$200>
  /**
   * withdrawLicenseRenewalRequest - Withdraw an LicenseRenewalRequest
   */
  'withdrawLicenseRenewalRequest'(
    parameters?: Parameters<Paths.WithdrawLicenseRenewalRequest.QueryParameters & Paths.WithdrawLicenseRenewalRequest.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.WithdrawLicenseRenewalRequest.Responses.$204>
}

export interface PathsDictionary {
  ['/feature-flags']: {
    /**
     * getFeatureFlags - Get feature flags
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetFeatureFlags.Responses.$200>
  }
  ['/login-links']: {
    /**
     * listLinks - Get list of links that initiate login
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ListLinks.Responses.$200>
  }
  ['/user']: {
    /**
     * getAuthenticatedUser - Get Authenticated User
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetAuthenticatedUser.Responses.$200>
  }
  ['/admin/tenant-registrations']: {
    /**
     * listTenantRegistrations - List all Tenant Registrations
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ListTenantRegistrations.Responses.$200>
    /**
     * createTenantRegistration - Create Tenant Registration
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.CreateTenantRegistration.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CreateTenantRegistration.Responses.$201>
  }
  ['/admin/tenant-registrations/{tenantId}']: {
    /**
     * deleteTenantRegistration - Delete Tenant Registration
     */
    'delete'(
      parameters?: Parameters<Paths.DeleteTenantRegistration.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.DeleteTenantRegistration.Responses.$204>
  }
  ['/app-install-requests']: {
    /**
     * listAppInstallRequests - List all AppInstallRequests
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ListAppInstallRequests.Responses.$200>
  }
  ['/app-install-requests/{contractId}:accept']: {
    /**
     * acceptAppInstallRequest - Accept an AppInstallRequest
     */
    'post'(
      parameters?: Parameters<Paths.AcceptAppInstallRequest.QueryParameters & Paths.AcceptAppInstallRequest.PathParameters> | null,
      data?: Paths.AcceptAppInstallRequest.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.AcceptAppInstallRequest.Responses.$201>
  }
  ['/app-install-requests/{contractId}:reject']: {
    /**
     * rejectAppInstallRequest - Reject an AppInstallRequest
     */
    'post'(
      parameters?: Parameters<Paths.RejectAppInstallRequest.QueryParameters & Paths.RejectAppInstallRequest.PathParameters> | null,
      data?: Paths.RejectAppInstallRequest.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.RejectAppInstallRequest.Responses.$204>
  }
  ['/app-installs']: {
    /**
     * listAppInstalls - List all AppInstalls
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ListAppInstalls.Responses.$200>
  }
  ['/app-installs/{contractId}:create-license']: {
    /**
     * createLicense - Create a License using the AppInstall
     */
    'post'(
      parameters?: Parameters<Paths.CreateLicense.QueryParameters & Paths.CreateLicense.PathParameters> | null,
      data?: Paths.CreateLicense.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CreateLicense.Responses.$201>
  }
  ['/app-installs/{contractId}:cancel']: {
    /**
     * cancelAppInstall - Cancel an AppInstall
     */
    'post'(
      parameters?: Parameters<Paths.CancelAppInstall.QueryParameters & Paths.CancelAppInstall.PathParameters> | null,
      data?: Paths.CancelAppInstall.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CancelAppInstall.Responses.$204>
  }
  ['/licenses']: {
    /**
     * listLicenses - List all Licenses (including renewal requests)
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ListLicenses.Responses.$200>
  }
  ['/licenses/{contractId}:renew']: {
    /**
     * renewLicense - Renew a License
     */
    'post'(
      parameters?: Parameters<Paths.RenewLicense.QueryParameters & Paths.RenewLicense.PathParameters> | null,
      data?: Paths.RenewLicense.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.RenewLicense.Responses.$201>
  }
  ['/licenses/{contractId}:complete-renewal']: {
    /**
     * completeLicenseRenewal - Complete the License Renewal
     */
    'post'(
      parameters?: Parameters<Paths.CompleteLicenseRenewal.QueryParameters & Paths.CompleteLicenseRenewal.PathParameters> | null,
      data?: Paths.CompleteLicenseRenewal.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CompleteLicenseRenewal.Responses.$200>
  }
  ['/licenses/{contractId}:expire']: {
    /**
     * expireLicense - Expire a License
     */
    'post'(
      parameters?: Parameters<Paths.ExpireLicense.QueryParameters & Paths.ExpireLicense.PathParameters> | null,
      data?: Paths.ExpireLicense.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ExpireLicense.Responses.$200>
  }
  ['/license-renewal-requests/{contractId}:withdraw']: {
    /**
     * withdrawLicenseRenewalRequest - Withdraw an LicenseRenewalRequest
     */
    'post'(
      parameters?: Parameters<Paths.WithdrawLicenseRenewalRequest.QueryParameters & Paths.WithdrawLicenseRenewalRequest.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.WithdrawLicenseRenewalRequest.Responses.$204>
  }
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>


export type AppInstall = Components.Schemas.AppInstall;
export type AppInstallCancel = Components.Schemas.AppInstallCancel;
export type AppInstallCreateLicenseRequest = Components.Schemas.AppInstallCreateLicenseRequest;
export type AppInstallCreateLicenseResult = Components.Schemas.AppInstallCreateLicenseResult;
export type AppInstallRequest = Components.Schemas.AppInstallRequest;
export type AppInstallRequestAccept = Components.Schemas.AppInstallRequestAccept;
export type AppInstallRequestCancel = Components.Schemas.AppInstallRequestCancel;
export type AppInstallRequestReject = Components.Schemas.AppInstallRequestReject;
export type AuthenticatedUser = Components.Schemas.AuthenticatedUser;
export type CompleteLicenseRenewalRequest = Components.Schemas.CompleteLicenseRenewalRequest;
export type ErrorResponse = Components.Schemas.ErrorResponse;
export type FeatureFlags = Components.Schemas.FeatureFlags;
export type License = Components.Schemas.License;
export type LicenseExpireRequest = Components.Schemas.LicenseExpireRequest;
export type LicenseParams = Components.Schemas.LicenseParams;
export type LicenseRenewRequest = Components.Schemas.LicenseRenewRequest;
export type LicenseRenewalRequest = Components.Schemas.LicenseRenewalRequest;
export type LicenseRenewalResult = Components.Schemas.LicenseRenewalResult;
export type LoginLink = Components.Schemas.LoginLink;
export type Metadata = Components.Schemas.Metadata;
export type TenantRegistration = Components.Schemas.TenantRegistration;
export type TenantRegistrationRequest = Components.Schemas.TenantRegistrationRequest;
