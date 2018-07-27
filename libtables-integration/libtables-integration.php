<?php
/*
Plugin Name: Libtables Integration
Plugin URI: https://github.com/bartnv/libtables2-wordpress
Description: WordPress plugin for Libtables integration
Version: 1.0
Author: Bart Noordervliet
License: AGPL3
License URI: https://www.gnu.org/licenses/agpl-3.0.html
*/
/*
Copyright 2018  Bart Noordervliet

    Libtables Integration is free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License version 3.0 as
    published by the Free Software Foundation.

    Libtables Integration is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Libtables Integration.  If not, see
    <https://www.gnu.org/licenses/>.
*/

defined('ABSPATH') or die('No script kiddies please!');

class Libtables_Integration {
  public static function handle_shortcode($atts) {
    if (empty($atts['block'])) return "No block in shortcode";
    return "Rendering block " . $atts['block'];
  }
}

add_shortcode('libtables', [ 'Libtables_Integration', 'handle_shortcode' ]);
