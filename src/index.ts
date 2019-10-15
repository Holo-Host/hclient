interface ZomeConfig {
    [x: string]: Array<string>,
}

interface DnaConfig {
    [x: string]: Array<string> | ZomeConfig,
}

const define_readonly = function ( obj, key, value ) {
    Object.defineProperty( obj, key, {
	"value": value,
	"writable": false
    });
}

/**
 * @module holo-host/web-sdk
 * 
 * @description
 * Full example
 * ```html
 * <script type="text/javascript" src="./holo-web-sdk.js"></script>
 * <script type="text/javascript">
 * (async () => {
 *     const happ = await HoloWebSDK.init();
 *     await happ.signIn();
 * 
 *     const holofuel = await happ.dna( "holofuel", {
 *         "transactions": ["ledger_state"],
 *     });
 * 
 *     await holofuel.transactions.ledger_state();
 * })();
 * </script>
 * ```
 * 
 * Development example
 * ```html
 * <script type="text/javascript" src="./holo-web-sdk.js"></script>
 * <script type="text/javascript">
 * (async () => {
 *     const happ = await HoloWebSDK.init( HoloWebSDK.DEVELOP );
 * 
 *     const holofuel = await happ.dna( "holofuel", {
 *         "transactions": ["ledger_state"],
 *     });
 * 
 *     await holofuel.transactions.ledger_state();
 * })();
 * </script>
 * ```
 * 
 * @property {symbol} DEVELOP	- Use for setting development mode
 * @property {symbol} PRODUCT	- Use for setting production mode
 */

/**
 * @global
 */
const HoloWebSDK			= {
    /**
     * Create and await initiation of a new hApp instance.
     * 
     * @async
     * @function init
     * 
     * @example
     * await HoloWebSDK.init();
     * 
     * @example <caption>Equivalent to</caption>
     * await (new HoloWebSDK.hApp()).init();
     */
    async init ( mode ?: symbol, happ_id ?: string ) {
	const instance			= new hApp( mode, happ_id );

	await instance.init();

	return instance;
    }
};
define_readonly( HoloWebSDK, "DEVELOP", Symbol("DEVELOP") );
define_readonly( HoloWebSDK, "PRODUCT", Symbol("PRODUCT") );


class hApp {

    public mode		: symbol;
    public happ_id	: string;
    
    /**
     * Initialize hApp instance.
     * 
     * **Behind the scenes**
     * 
     * In `PRODUCT` mode, you don't have to provide the HHA ID because it will be fetched from
     * Resolver based on the domain name.
     * 
     * The Secure iFrame derives an instance name using the Agent ID, HHA ID, and DNA Alias.  This
     * is the minimal information required to ensure unique instance IDs for HPOS.  When testing
     * against Conductor, Agent ID is omitted because HHA ID and DNA Alias are unique.
     * 
     * **Supported environments**
     * 
     * Holo Hosting
     *   - Fetches HHA ID from resolver based on domain
     *   - Creates a random Agent ID for anonymous requests
     * 
     * Development mode for Holo Hosting target (talks directly to Conductor)
     *   - HHA ID must be specified and is used as instance ID prefix
     *   - Agent ID is managed by Conductor (technically, user is always signed in)
     * 
     * Holochain Conductor
     *   - hApp ID must be specified and is used as instance ID prefix
     *   - Agent ID is managed by Conductor
     * 
     * 
     * @class hApp
     * 
     * @param {number} mode		- PRODUCT or DEVELOP mode (default: PRODUCT)
     * @param {string} happ_id		- hApp ID (required when `mode` is DEVELOP)
     * 
     * @example
     * const HoloWebSDk = require("@holo-host/web-sdk");
     * const happ = await HoloWebSDK.init();
     * 
     * @example <caption>Development mode</caption>
     * const HoloWebSDk = require("@holo-host/web-sdk");
     * const happ = await HoloWebSDK.init( HoloWebSDK.DEVELOP, "QmUgZ8e6xE1h9fH89CNqAXFQkkKyRh2Ag6jgTNC8wcoNYS" );
     * 
     * @throws Will throw error if `happ_id` is given when `this.mode` is not set to DEVELOP
     */
    constructor ( mode ?: symbol, happ_id ?: string ) {
	this.mode			= mode;
	this.happ_id			= happ_id;
    }

    /**
     * Initiate hApp ID detection
     * 
     * @async
     * 
     * @example
     * await happ.init();
     */
    public async init () : Promise<void> {
    }

    /**
     * Launch Holo sign in prompt
     * 
     * @async
     * 
     * @return {boolean} Success indicator
     * 
     * @example
     * await happ.signIn();
     */
    public async signIn () : Promise<boolean> {
	return false;
    }

    /**
     * Delete Agent keys and any session data
     * 
     * @async
     * 
     * @return {boolean} Success indicator
     * 
     * @example
     * await happ.signOut();
     */
    public async signOut () : Promise<boolean> {
	return false;
    }

    /**
     * Launch Holo sign in prompt
     * 
     * @param {string} alias		- DNA alias (by convention)
     * @param {object} config		- Zome
     * 
     * @return {DNA} Newly create DNA instance
     * 
     * @example
     * const holofuel = await happ.dna( "holofuel" );
     */
    public dna ( alias : string, config ?: DnaConfig ) : DNA {
	return new DNA( this, alias, config );
    }

    // /**
    //  * Manually set Agent ID in development mode
    //  * 
    //  * @async
    //  * @param {string} id		- Agent ID set up in Conductor config
    //  * 
    //  * @throws Will throw error if `this.mode` is not set to DEVELOP
    //  * 
    //  * @example
    //  * const happ = await HoloWebSDK.init( HoloWebSDK.DEVELOP, "QmUgZ8e6xE1h9fH89CNqAXFQkkKyRh2Ag6jgTNC8wcoNYS" );
    //  * await happ.setAgentId( "HcSCj5I6otz4bPt334BF4HeoQp6V9jjsiTfzokneQ7yrv3wiUcKAbrb5D79nt5i" );
    //  */
    // public async setAgentId ( id : string ) : Promise<void> {
    // }

}


class DNA {

    /**
     * Initialize DNA instance
     * 
     * @class DNA
     * 
     * @param {string} alias		- DNA
     * @param {string} config		- Zome and function map
     */
    constructor ( happ_instance : hApp, alias : string, config ?: DnaConfig ) {
    }

    /**
     * Execute a zome/function for this DNA
     * 
     * @async
     * 
     * @param {string} zome		- Zome name
     * @param {string} func		- Function name
     * @param {object} args		- Function arguments (optional)
     * 
     * @return {*} 
     * 
     * @example
     * const holofuel = await happ.dna( "holofuel" );
     * await holofuel.run( "transactions", "ledger_state" );
     * 
     * @example <caption>Configure DNA methods</caption>
     * const holofuel = await happ.dna( "holofuel", {
     *     "transactions": ["ledger_state"],
     * });
     * await holofuel.transactions.ledger_state();
     */
    public async run ( zome : string, func : string, args ?: object ) : Promise<any> {
    }
    
}

export default HoloWebSDK;
export {
    hApp,
    DNA,
};
