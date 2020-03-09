$LOAD_PATH.unshift File.expand_path(File.dirname(File.dirname(__FILE__)))

ENV['RACK_ENV'] = 'test'
require 'minitest/autorun'
