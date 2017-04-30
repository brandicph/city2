module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        bowerRequirejs: {
            target: {
                rjsConfig: 'public/js/config.js'
            }
        },
        sass: {
            options: {
                outputStyle: 'compressed',
            },
            dist: {
                files: {
                    'public/css/main.css': ['public/scss/main.scss'],
                }
            }
        },
        bower_concat: {
            all: {
                dest: {
                    'js': 'public/js/bundle.js',
                    'css': 'public/css/bundle.css',
                },
                bowerOptions: {
                    relative: false
                },
            },
        },
        watch: {
            options: {
                livereload: true
            },
            src: {
                files: [
                    'public/scss/*',
                ],
                tasks: ['sass'],
            },
        },
        nodemon: {
            dev: {
                script: 'server.js'
            }
        },
    });



    grunt.loadNpmTasks('grunt-sass');
    grunt.loadNpmTasks('grunt-bower-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-bower-requirejs');

    // Default task(s).
    grunt.registerTask('default', ['sass', 'bower_concat', 'watch']);

};
