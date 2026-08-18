CREATE DATABASE IF NOT EXISTS user_info;
USE user_info;

CREATE TABLE IF NOT EXISTS Login (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userHash VARCHAR(255) NOT NULL,
    userName VARCHAR(255) NOT NULL UNIQUE,
    userSalt VARCHAR(255) NOT NULL
);


CREATE TABLE IF NOT EXISTS Songs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    songName VARCHAR(255) NOT NULL,
    genre VARCHAR(100),
    explicit BOOLEAN DEFAULT FALSE
);


CREATE TABLE IF NOT EXISTS Artists (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS Songs_artists_link (
    songID INT NOT NULL,
    artistID INT NOT NULL,
    PRIMARY KEY (songID, artistID)
);

CREATE TABLE  IF NOT EXISTS Songs_artists_user_link (
    songID INT NOT NULL,
    artistID INT NOT NULL,
    userID INT NOT NULL,
    PRIMARY KEY (songID, artistID, userID)
);

CREATE TABLE IF NOT EXISTS Songs_user_link (
    songID INT NOT NULL,
    userID INT NOT NULL,
    rating TINYINT NOT NULL CHECK (rating IN (0, 1)),
    PRIMARY KEY (songID,userID)
);

CREATE TABLE IF NOT EXISTS Feedback (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message TEXT NOT NULL,
    severity VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS Feedback_user_link (
    feedbackID INT NOT NULL,
    userID INT NOT NULL,
    PRIMARY KEY (feedbackID, userID)
);

CREATE TABLE IF NOT EXISTS Bug_Reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message TEXT NOT NULL,
    severity VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS Bug_Report_user_link (
    reportID INT NOT NULL,
    userID INT NOT NULL,
    PRIMARY KEY (reportID, userID)
);

CREATE TABLE IF NOT EXISTS Permission_Level (
    id INT PRIMARY KEY AUTO_INCREMENT,
    credentialLevel VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Permission_user_link (
    permissionID INT NOT NULL,
    userID INT NOT NULL,
    PRIMARY KEY (permissionID, userID)
);
