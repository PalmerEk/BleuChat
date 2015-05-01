CREATE DATABASE bleuchat;

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- drop table dist;

CREATE TABLE IF NOT EXISTS dist (
    id INT(11) NOT NULL AUTO_INCREMENT,
    botname VARCHAR(34) NULL,
    username VARCHAR(34) NOT NULL,
    coin VARCHAR(10) NOT NULL,
    amount REAL NOT NULL,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX username (username),
    INDEX botname (botname),
    INDEX coin (coin),
    INDEX time (ts)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

