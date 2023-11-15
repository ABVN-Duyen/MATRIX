entity app.interactions.INPUT_SAMPLE_MATRIX {
    LARGECLS   : String(50)  @title: 'Large Classification';
    MINORCLS   : String(100) @title: 'Minor Classification';
    DEPVARNAME : String(100) @title: 'Dependent Variable Name';
    EPLVARNUM  : String(50)  @title: 'Explanatory Variable Number';
    EPLVARNAME : String(500) @title: 'Explanatory Variable Name';
    DESIREDCOR : String(50)  @title: 'Desired Correlation';
    NOY        : String(50)  @title: 'Number of Years';
    REGCOE     : Double      @title: 'Regression Coefficent';
    FREEADJCOE : Double      @title: 'Freedom Adjust Coefficent Value';
    PVALUE     : Double      @title: 'p-value';
    CLIENT     : String(200) @title: 'Client'
};

entity db.OVERLOOKING_ANALYSIS {
    key CLIENT             : String(100);
    key CLIENT_ITEM        : String(100);
    key SEQUENCE_NO        : String(100);
    DEP_VAR            : String(100);
    DEP_NAME           : String(200);
    DEP_NO             : String(100);
    DEP_ITM_NO         : String(100);
    DEP_ITM_NAME       : String(500);
    INTERCEPT          : String(100);
    RE_COEFFICIENT     : String(100);
    STD_ERROR          : String(100);
    T_VAL              : Double;
    P_VAL              : Double;
    LOW_BOUND          : String(100);
    UPP_BOUND          : String(100);
    EXPL_VAR_1         : String(100);
    RE_COEFFICIENT_1   : String(100);
    STD_ERROR_1        : String(100);
    T_VAL_1            : Double;
    P_VAL_1            : Double;
    LOW_BOUND_1        : String(100);
    UPP_BOUND_1        : String(100);
    EXPL_VAR_2         : String(100);
    RE_COEFFICIENT_2   : String(100);
    STD_ERROR_2        : String(100);
    T_VAL_2            : Double;
    P_VAL_2            : Double;
    LOW_BOUND_2        : String(100);
    UPP_BOUND_2        : String(100);
    EXPL_VAR_NAME_1    : String(500);
    EXPL_VAR_NAME_2    : String(500);
    OBSER_NO           : String(100);
    DE_COEFFICIENT     : String(100);
    DE_COEFFICIENT_AFT : String(100);
    STD_ERROR_REG      : String(100);
    F_VALUE            : Double;
    EXPL_VAR_NO        : String(100);
    DEG_FREE           : String(100);
    P_VALUE_F          : Double;
    SHIFT_YEAR         : String(100);
    EXPL_VAR_ITM_NO    : String(100);
    EXPL_VAR_ITM_NAME  : String(500);
    EXPL_VAR           : String(100);
    DESIRED_CORR       : String(100);
    MAJ_CLASS          : String(100);
    MIN_CLASS          : String(100);
};

entity app.interactions.CLIENTS {
    key CLIENTKEY   : String(200) @title: 'Client';
        CLIENT_ITEM : String(50)  @title: 'Cient Item';
        CLIENTNAME  : String(200) @title: 'Client Name';
};


entity db.NODES_VIEW {

    key NODEKEY    : String(200) @title: 'NODEKEY';
    key CLIENT     : String(50)  @title: 'CLIENT';
        NODETITLE  : String(100) @title: 'NODETITLE';
        NODESTATUS : String(50)  @title: 'NODESTATUS';
        NODESHAPE  : String(50)  @title: 'NODESHAPE';
        NODEGROUP  : String(50)  @title: 'NODEGROUP';

};

entity db.LINES_VIEW {

    key LINEFROM   : String(100) @title: 'LINEFROM';
    key LINETO     : String(100) @title: 'LINETO';
    key CLIENT     : String(50)  @title: 'CLIENT';
        LINESTATUS : String(50)  @title: 'LINESTATUS';
        LINETYPE   : String(50)  @title: 'LINETYPE';

};

entity db.INPUT_VIEW {

    key SOURCE       : String(100) @title: 'SOURCE';
    key INDSOURCE    : String(100) @title: 'INDICATOR SOURCE';
    key DESTINATION  : String(100) @title: 'DESTINATION';
    key INDDEST      : String(100) @title: 'INDICATOR DESTINATION';
    key CLIENT       : String(100) @title: 'CLIENT';
    KEY CLIENT_ITEM  : String(100) @title: 'CLIENT ITEM';
    key RELATIONSHIP : String(50)  @title: 'RELATIONSHIP';
        AREA         : String(50)  @title: 'SOURCE AREA';
        DESAREA      : String(50)  @title: 'DESTINATION AREA';

};

entity db.GROUP_VIEW {

    key GROUPKEY : String(100) @title: 'GROUP KEY';
    key CLIENT   : String(50)  @title: 'CLIENT';
        TITLE    : String(100) @title: 'TITLE';

};

entity db.CLIENT_VIEW {

    key CLIENTKEY   : String(50) @title: 'CLIENT';
    key CLIENT_ITEM : String(50) @title: 'CLIENT ITEM';
        TITLE       : String(50) @title: 'TITLE';
        MATRIX: String(1)  @title: 'MATRIX ACTIVATION';
        CHART: String(1)   @title : 'CHART ACTIVATION';
};

Entity db.SIGNIFICANT {
        key CLIENT: String(100) @title: 'CLIENT';
        key CLIENT_ITEM: String(100) @title : 'CLIENT ITEM';
        key SOURCE: String(100)  @title: 'SOURCE' ; 
        key INDSOURCE: String(100)  @title: 'INDICATOR SOURCE' ; 
        key DESTINATION: String(100)  @title: 'DESTINATION' ; 
        key INDDEST: String(100)  @title: 'INDICATOR DESTINATION' ;
        VALID_HYPO_FLG: String(100) @title : 'VALID IN HYPOTHESIS LIST';
        CORR_MATCH_FLG: String(100) @title : 'CORRELATION MATCH';
};
