using app.interactions from '../db/interactions';
using db from '../db/interactions';
service GraphService {

entity INPUT_SAMPLE_MATRIX
    as projection on interactions.INPUT_SAMPLE_MATRIX;

entity CLIENT_VIEW as projection on db.CLIENT_VIEW;

entity SIGNIFICANT as projection on db.SIGNIFICANT;

entity OVERLOOKING_ANALYSIS as projection on db.OVERLOOKING_ANALYSIS;

function getOverlookingAnalysis(client: String, client_item:String) returns array of OVERLOOKING_ANALYSIS ;
function getInputSampleMatrix() returns array of INPUT_SAMPLE_MATRIX;
function deleteClient(client: String, client_item:String) returns Boolean;
function deleteInputofClient(client: String, client_item:String) returns Boolean;
function getInputWithClient(client: String, client_item:String) returns array of OVERLOOKING_ANALYSIS;
function fetchClients() returns array of {CLIENT: String; CLIENT_ITEM:String };
function fetchClientsFromSignificant() returns array of {CLIENT: String; CLIENT_ITEM:String };
function fetchClientsMaster( client: String ) returns array of CLIENT_VIEW;
function fetchClientsItemMaster( client: String, client_item:String ) returns array of CLIENT_VIEW;
function updateClientsMaster( clientline: array of GraphService.CLIENT_VIEW ) returns Boolean; //Duyen

action upload(uploadData: array of GraphService.OVERLOOKING_ANALYSIS ) returns Boolean;
}