class RenamePresetSearchFields < Mongoid::Migration
  def self.up
    PresetSearch.all.each do |search|
      search.rename(accession_whitelist: :accession_list)
    end
  end

  def self.down
  end
end
