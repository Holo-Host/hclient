interface ZomeConfig {
    [x: string]: Array<string>,
}

interface DnaConfig {
    [x: string]: Array<string> | ZomeConfig,
}

enum ModeTypes {
    Development,
    Production,
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
 * ```javascript
 * const HoloWebSDk = require("@holo-host/web-sdk");
 * 
 * (async () => {
 *     const happ = await HoloWebSDK.init();
 *     const holofuel = await happ.dna( "holofuel", {
 *         "transactions": ["ledger_state"],
 *     });
 * 
 *     await holofuel.transactions.ledger_state();
 * })();
 * ```
 * 
 * Development example
 * ```javascript
 * const HoloWebSDk = require("@holo-host/web-sdk");
 * 
 * (async () => {
 *     const happ = await HoloWebSDK.init( HoloWebSDK.DEVELOP, "QmUgZ8e6xE1h9fH89CNqAXFQkkKyRh2Ag6jgTNC8wcoNYS" );
 *     await happ.setAgentId( "HcSCj5I6otz4bPt334BF4HeoQp6V9jjsiTfzokneQ7yrv3wiUcKAbrb5D79nt5i" );
 *     const holofuel = await happ.dna( "holofuel", {
 *         "transactions": ["ledger_state"],
 *     });
 * 
 *     await holofuel.transactions.ledger_state();
 * })();
 * ```
 */

/**
 * Constants
 * 
 * @namespace HoloWebSDK
 * 
 * @property {number} DEVELOP	- Use for setting development mode
 * @property {number} PRODUCT	- Use for setting production mode
 */
const HoloWebSDK			= {};
define_readonly( HoloWebSDK, "DEVELOP", ModeTypes.Development );
define_readonly( HoloWebSDK, "PRODUCT", ModeTypes.Production );

class hApp {

    public mode		: ModeTypes;
    public happ_id	: string;
    
    /**
     * Initialize hApp instance.  In PRODUCT mode it will get the hApp ID based on the domain.
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
    constructor ( mode : ModeTypes, happ_id : string ) {
	this.mode			= mode;
	this.happ_id			= happ_id;
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

    /**
     * Manually set Agent ID in development mode
     * 
     * @param {string} id		- Agent ID set up in Conductor config
     * 
     * @throws Will throw error if `this.mode` is not set to DEVELOP
     * 
     * @example
     * const happ = await HoloWebSDK.init( HoloWebSDK.DEVELOP, "QmUgZ8e6xE1h9fH89CNqAXFQkkKyRh2Ag6jgTNC8wcoNYS" );
     * await happ.setAgentId( "HcSCj5I6otz4bPt334BF4HeoQp6V9jjsiTfzokneQ7yrv3wiUcKAbrb5D79nt5i" );
     */
    public setAgentId ( id : string ) : void {
    }

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
